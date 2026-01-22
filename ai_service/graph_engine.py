import json
import networkx as nx
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Optional
import pickle
import re


class GraphRAG:
    def __init__(self, data_path="data/knowledge_base.json", cache_dir="data/cache"):
        print("🧠 Đang khởi động Graph Engine V3.1 (Tiếng Việt)...")
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. Load Dữ liệu
        self.products = self._load_data(data_path)
        if not self.products:
            raise ValueError("Không có dữ liệu sản phẩm! Kiểm tra lại etl_pipeline.py")
        print(f"📦 Đã load {len(self.products)} sản phẩm.")

        # 2. Load Model Đa Ngôn Ngữ
        model_name = 'paraphrase-multilingual-MiniLM-L12-v2'
        print(f"⏳ Đang load mô hình AI: {model_name}...")
        self.encoder = SentenceTransformer(model_name)
        
        # Cache embeddings với tên model-specific
        cache_file = self.cache_dir / "product_embeddings_multilingual.pkl"
        self.product_embeddings = self._load_or_create_embeddings(cache_file)
        
        # 3. Extract unique categories từ dữ liệu thực tế
        self._build_category_keywords()
        
        # 4. Build Graph
        print("🕸️ Đang xây dựng đồ thị tri thức...")
        self.graph = self._build_graph_smart()
        print(f"✅ Graph: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")
        print("✅ Graph Engine đã sẵn sàng!")

    def _load_data(self, path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    def _load_or_create_embeddings(self, cache_file):
        if cache_file.exists():
            print("⚡ Đang load embeddings từ cache...")
            with open(cache_file, 'rb') as f:
                return pickle.load(f)
        else:
            print("⏳ Đang vector hóa dữ liệu (Lần đầu mất khoảng 1-2 phút)...")
            corpus_texts = [p['full_text'] for p in self.products]
            embeddings = self.encoder.encode(corpus_texts, show_progress_bar=True, batch_size=32)
            
            with open(cache_file, 'wb') as f:
                pickle.dump(embeddings, f)
            print("💾 Đã cache embeddings.")
            return embeddings

    def _build_category_keywords(self):
        """Tự động xây dựng keyword mapping từ dữ liệu thực tế"""
        # Extract categories từ products
        categories = set(p.get('category', '') for p in self.products if p.get('category'))
        
        # Keyword mapping mở rộng và thông minh hơn
        self.category_keywords = {
            "điện thoại": {
                "keywords": ["điện thoại", "iphone", "smartphone", "samsung", "oppo", "xiaomi", 
                           "redmi", "realme", "vivo", "oneplus", "mobile", "phone"],
                "boost": 0.25  # Boost vừa phải
            },
            "đồng hồ": {
                "keywords": ["đồng hồ", "watch", "smartwatch", "apple watch", "galaxy watch"],
                "boost": 0.25
            },
            "tai nghe": {
                "keywords": ["tai nghe", "headphone", "earphone", "airpods", "earbud", 
                           "headset", "loa"],
                "boost": 0.25
            },
            "laptop": {
                "keywords": ["laptop", "máy tính", "macbook", "notebook", "ultrabook"],
                "boost": 0.25
            },
            "màn hình": {
                "keywords": ["màn hình", "monitor", "display", "màn"],
                "boost": 0.25
            },
            "tablet": {
                "keywords": ["tablet", "ipad", "máy tính bảng"],
                "boost": 0.25
            }
        }
        
        # Thêm các category thực tế từ database (nếu có)
        for cat in categories:
            cat_lower = cat.lower()
            if cat_lower not in self.category_keywords:
                # Tự động tạo keywords từ category name
                self.category_keywords[cat_lower] = {
                    "keywords": [cat_lower, cat],
                    "boost": 0.2  # Boost thấp hơn cho unknown categories
                }

    def _build_graph_smart(self):
        """Xây dựng graph thông minh hơn"""
        G = nx.Graph()
        products_by_cat = {}
        
        # Add nodes
        for p in self.products:
            G.add_node(p['id'], **p)
            cat = p.get('category', '')
            if cat:
                if cat not in products_by_cat:
                    products_by_cat[cat] = []
                products_by_cat[cat].append(p['id'])
        
        # Nối các sản phẩm cùng category (giới hạn để graph không quá nặng)
        max_products_per_cat = 30  # Tăng từ 20 lên 30
        max_neighbors_per_product = 5  # Mỗi sản phẩm chỉ nối với 5 sản phẩm khác
        
        for cat, ids in products_by_cat.items():
            if len(ids) < 2:
                continue
            
            # Chỉ xử lý top N sản phẩm đầu tiên trong category
            ids_to_process = ids[:max_products_per_cat]
            
            for i, prod_id_i in enumerate(ids_to_process):
                neighbors_added = 0
                
                # Nối với các sản phẩm còn lại trong cùng category
                for j, prod_id_j in enumerate(ids_to_process):
                    if i != j and neighbors_added < max_neighbors_per_product:
                        if not G.has_edge(prod_id_i, prod_id_j):
                            G.add_edge(prod_id_i, prod_id_j, relation="cùng_danh_mục")
                            neighbors_added += 1
        
        return G

    def _extract_query_intent(self, query: str) -> Dict:
        """Phân tích query để tìm intent (category, price range, model numbers, etc.)"""
        query_lower = query.lower()
        intent = {
            "target_categories": [],
            "price_mentioned": False,
            "price_range": None,
            "keywords": [],
            "model_numbers": [],  # ✅ THÊM: Extract số model
            "model_variants": []  # ✅ THÊM: Extract variant (pro, max, plus)
        }
        
        # Tìm category keywords
        for category, config in self.category_keywords.items():
            keywords = config.get("keywords", [])
            for keyword in keywords:
                if keyword in query_lower:
                    if category not in intent["target_categories"]:
                        intent["target_categories"].append(category)
                    intent["keywords"].extend(keywords)
                    break
        
        # Tìm price range TRƯỚC để loại trừ số trong price khi extract model numbers
        price_patterns = [
            r'(\d+)\s*(?:triệu|tr)',
            r'khoảng\s*(\d+)\s*(?:triệu|tr)',
            r'giá\s*(?:từ|khoảng)?\s*(\d+)\s*(?:triệu|tr)',
        ]
        
        price_numbers = set()  # Lưu các số trong price để loại trừ
        for pattern in price_patterns:
            match = re.search(pattern, query_lower)
            if match:
                intent["price_mentioned"] = True
                price_value = int(match.group(1)) * 1000000  # Convert to VND
                # Price range ±30%
                intent["price_range"] = (int(price_value * 0.7), int(price_value * 1.3))
                price_numbers.add(int(match.group(1)))  # Lưu số trong price
                break
        
        # ✅ THÊM: Extract model numbers (số như 17, 15, 14, 13...) - loại trừ số trong price
        model_number_pattern = r'\b(\d{1,2})\b'
        model_matches = re.findall(model_number_pattern, query_lower)
        if model_matches:
            # Lọc các số hợp lý cho model (1-99) và loại trừ số trong price
            intent["model_numbers"] = [
                int(m) for m in model_matches 
                if 1 <= int(m) <= 99 and int(m) not in price_numbers
            ]
        
        # ✅ THÊM: Extract variants (pro, max, plus, mini, ultra, se...)
        variant_keywords = ['pro', 'max', 'plus', 'mini', 'ultra', 'se', 'standard']
        for variant in variant_keywords:
            if variant in query_lower:
                intent["model_variants"].append(variant)
        
        return intent

    def _calculate_boost_score(self, product: Dict, intent: Dict) -> float:
        """Tính điểm boost dựa trên intent"""
        boost = 0.0
        prod_text = (product.get('name', '') + " " + product.get('category', '')).lower()
        
        # Category boost
        if intent["target_categories"]:
            matched_keywords = []
            for category in intent["target_categories"]:
                config = self.category_keywords.get(category, {})
                keywords = config.get("keywords", [])
                boost_value = config.get("boost", 0.2)
                
                for keyword in keywords:
                    if keyword in prod_text:
                        matched_keywords.append((keyword, boost_value))
            
            if matched_keywords:
                # Lấy boost value cao nhất
                max_boost = max(boost_value for _, boost_value in matched_keywords)
                boost += max_boost
            else:
                # Phạt nhẹ nếu query rõ ràng về category nhưng product không match
                boost -= 0.1
        
        # ✅ THÊM: Model number matching
        query_models = set(intent.get("model_numbers", []))
        query_variants = set(intent.get("model_variants", []))
        
        if query_models or query_variants:
            product_model = self._extract_product_model(product)
            product_models = set(product_model.get("model_numbers", []))
            product_variants = set(product_model.get("model_variants", []))
            
            # Exact model match: boost rất lớn
            if query_models and product_models:
                if query_models == product_models:  # Exact match (17 == 17)
                    boost += 0.6  # Boost lớn cho exact match
                elif query_models & product_models:  # Có overlap (17 trong [15, 16, 17])
                    boost += 0.3  # Boost vừa nếu có một phần match
                else:
                    # Model conflict: penalty lớn (17 vs 15)
                    boost -= 0.5  # Penalty lớn khi model khác nhau rõ ràng
            
            # Variant matching
            if query_variants and product_variants:
                if query_variants & product_variants:  # Có variant match (pro, max...)
                    boost += 0.3
                # Không penalty nếu không có variant match (vì có thể là standard)
        
        # Price boost (nếu có mention giá trong query)
        if intent["price_mentioned"] and intent["price_range"]:
            price = product.get('price', 0)
            if price and intent["price_range"][0] <= price <= intent["price_range"][1]:
                boost += 0.15  # Bonus nếu giá trong khoảng
        
        return boost

    def _extract_product_model(self, product: Dict) -> Dict:
        """Extract model numbers và variants từ product name"""
        name = product.get('name', '').lower()
        model_info = {
            "model_numbers": [],
            "model_variants": []
        }
        
        # Extract model numbers (số như 17, 15, 14...)
        model_number_pattern = r'\b(\d{1,2})\b'
        model_matches = re.findall(model_number_pattern, name)
        if model_matches:
            model_info["model_numbers"] = [int(m) for m in model_matches if 1 <= int(m) <= 99]
        
        # Extract variants (pro, max, plus, mini, ultra, se)
        variant_keywords = ['pro', 'max', 'plus', 'mini', 'ultra', 'se', 'standard']
        for variant in variant_keywords:
            if variant in name:
                model_info["model_variants"].append(variant)
        
        return model_info

    def retrieve(self, query: str, top_k: int = 5, graph_expansion: int = 2, 
                min_similarity: float = 0.2) -> List[Dict]:
        """
        Tìm kiếm thông minh với keyword boosting và graph expansion
        """
        # B1: Phân tích query intent
        intent = self._extract_query_intent(query)
        
        # B2: Vector Search
        query_vec = self.encoder.encode([query], show_progress_bar=False)
        scores = cosine_similarity(query_vec, self.product_embeddings)[0]
        
        # B3: Re-ranking với Smart Boosting
        adjusted_scores = []
        for idx, score in enumerate(scores):
            product = self.products[idx]
            
            # Base score từ vector similarity
            final_score = float(score)
            
            # Apply boosting
            boost = self._calculate_boost_score(product, intent)
            final_score += boost
            
            # Đảm bảo score >= 0
            final_score = max(0.0, final_score)
            
            adjusted_scores.append((idx, final_score, boost))
        
        # Sắp xếp theo điểm đã điều chỉnh
        adjusted_scores.sort(key=lambda x: x[1], reverse=True)
        
        # B4: Thu thập kết quả (chỉ lấy các sản phẩm có điểm >= min_similarity)
        retrieved_products = []
        seen_ids = set()
        
        # Lấy top candidates (nhiều hơn top_k để có buffer cho graph expansion)
        candidate_indices = [x[0] for x in adjusted_scores if x[1] >= min_similarity]
        
        for idx in candidate_indices[:top_k * 2]:  # Lấy nhiều hơn để có buffer
            p_id = self.products[idx]['id']
            
            if p_id not in seen_ids:
                score_info = next(x for x in adjusted_scores if x[0] == idx)
                final_score, boost = score_info[1], score_info[2]
                
                prod = self.products[idx].copy()
                prod['source'] = 'search'
                prod['score'] = final_score
                prod['vector_score'] = float(scores[idx])
                prod['boost'] = boost
                
                retrieved_products.append(prod)
                seen_ids.add(p_id)
                
                # Graph expansion (chỉ nếu điểm đủ cao)
                if (graph_expansion > 0 and final_score > 0.3 and 
                    self.graph.has_node(p_id)):
                    neighbors = list(self.graph.neighbors(p_id))
                    
                    for n_id in neighbors[:graph_expansion]:
                        if n_id not in seen_ids:
                            # Tìm product trong list
                            n_prod = next((p.copy() for p in self.products if p['id'] == n_id), None)
                            
                            if n_prod:
                                # Tính lại điểm cho neighbor (thấp hơn node gốc)
                                neighbor_boost = self._calculate_boost_score(n_prod, intent)
                                neighbor_idx = next((i for i, p in enumerate(self.products) 
                                                   if p['id'] == n_id), None)
                                
                                if neighbor_idx is not None:
                                    neighbor_vector_score = float(scores[neighbor_idx])
                                    neighbor_score = neighbor_vector_score + neighbor_boost
                                    neighbor_score = max(0.0, neighbor_score * 0.85)  # Penalty 15%
                                    
                                    if neighbor_score >= min_similarity * 0.8:
                                        n_prod['source'] = 'graph_suggest'
                                        n_prod['score'] = neighbor_score
                                        n_prod['vector_score'] = neighbor_vector_score
                                        n_prod['boost'] = neighbor_boost
                                        
                                        retrieved_products.append(n_prod)
                                        seen_ids.add(n_id)
        
        # B5: Final sorting
        retrieved_products.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        return retrieved_products[:top_k]


# --- TEST ---
if __name__ == "__main__":
    engine = GraphRAG()
    
    queries = [
        "tôi muốn mua điện thoại chụp ảnh đẹp giá khoảng 20 triệu",
        "có đồng hồ nào pin trâu không",
        "tai nghe không dây tốt"
    ]
    
    for q in queries:
        print(f"\n{'='*60}")
        print(f"🔎 Query: '{q}'")
        print('='*60)
        results = engine.retrieve(q, top_k=3)
        
        for i, p in enumerate(results, 1):
            print(f"\n{i}. {p['name']}")
            print(f"   📂 {p.get('category', 'N/A')}")
            print(f"   💰 Giá: {p.get('price', 0):,} VNĐ")
            print(f"   ⭐ Rating: {p.get('rating', 0):.1f}/5")
            print(f"   📊 Score: {p['score']:.3f} (Vector: {p.get('vector_score', 0):.3f}, Boost: {p.get('boost', 0):+.2f})")
            print(f"   🔍 Source: {p['source']}")