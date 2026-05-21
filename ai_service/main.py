"""
AI Service API V3.5: Full Response Caching với OpenAI API
Improved: Caches BOTH Query Rewriting AND Final Answers + Performance + Security
Using OpenAI GPT API
"""

import os
import time
import asyncio
import hashlib
import json
from typing import Dict, List, Optional
from pathlib import Path
from collections import OrderedDict

from openai import AsyncOpenAI
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from graph_engine import GraphRAG

import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load biến môi trường
load_dotenv()

# Cấu hình OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY không được tìm thấy trong .env file! Vui lòng thêm OPENAI_API_KEY vào file .env")

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
  # gpt-3.5-turbo (rẻ, nhanh) hoặc gpt-4 (chất lượng)
OPENAI_CLIENT = AsyncOpenAI(api_key=OPENAI_API_KEY)

# Cấu hình CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
if ALLOWED_ORIGINS == ["*"]:
    logger.warning("⚠️ CORS đang cho phép tất cả origins. Không an toàn cho production!")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Global Engine
rag_engine: Optional[GraphRAG] = None
rag_engine_lock = asyncio.Lock()

# --- CACHE SYSTEM ---
CACHE_DIR = Path("data/cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

REWRITE_CACHE_FILE = CACHE_DIR / "query_rewrite_cache.json"
ANSWER_CACHE_FILE = CACHE_DIR / "answer_cache.json"

# Cache với LRU (giới hạn size)
MAX_CACHE_SIZE = 1000  # Tối đa 1000 entries mỗi cache
rewrite_cache: OrderedDict = OrderedDict()
answer_cache: OrderedDict = OrderedDict()

# Flag để debounce save
_cache_dirty = False
_last_save_time = 0
SAVE_DEBOUNCE_SECONDS = 5  # Chỉ save sau 5 giây nếu có thay đổi

def load_caches():
    """Load cache từ file"""
    global rewrite_cache, answer_cache
    try:
        if REWRITE_CACHE_FILE.exists():
            data = json.load(open(REWRITE_CACHE_FILE, 'r', encoding='utf-8'))
            rewrite_cache = OrderedDict(list(data.items())[-MAX_CACHE_SIZE:])
        
        if ANSWER_CACHE_FILE.exists():
            data = json.load(open(ANSWER_CACHE_FILE, 'r', encoding='utf-8'))
            answer_cache = OrderedDict(list(data.items())[-MAX_CACHE_SIZE:])
        
        logger.info(f"✅ Cache loaded: {len(rewrite_cache)} rewrites, {len(answer_cache)} answers")
    except Exception as e:
        logger.warning(f"⚠️ Cache load error: {e}")
        rewrite_cache = OrderedDict()
        answer_cache = OrderedDict()
    
async def get_rag_engine() -> GraphRAG:
    global rag_engine

    if rag_engine is not None:
        return rag_engine

    async with rag_engine_lock:
        if rag_engine is None:
            logger.info("🔄 Lazy loading Graph Engine...")
            loop = asyncio.get_running_loop()
            rag_engine = await loop.run_in_executor(None, GraphRAG)
            logger.info("✅ Graph Engine loaded successfully!")

    return rag_engine

def save_caches(force: bool = False):
    """Lưu cache với debounce để tránh ghi file quá nhiều"""
    global _cache_dirty, _last_save_time
    
    if not force:
        current_time = time.time()
        if not _cache_dirty:
            return
        if current_time - _last_save_time < SAVE_DEBOUNCE_SECONDS:
            return  # Chưa đến lúc save
    
    try:
        # Giới hạn size cache (LRU)
        if len(rewrite_cache) > MAX_CACHE_SIZE:
            # Xóa các entry cũ nhất
            while len(rewrite_cache) > MAX_CACHE_SIZE:
                rewrite_cache.popitem(last=False)
        
        if len(answer_cache) > MAX_CACHE_SIZE:
            while len(answer_cache) > MAX_CACHE_SIZE:
                answer_cache.popitem(last=False)
        
        with open(REWRITE_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(dict(rewrite_cache), f, ensure_ascii=False, indent=2)
        
        with open(ANSWER_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(dict(answer_cache), f, ensure_ascii=False, indent=2)
        
        _cache_dirty = False
        _last_save_time = time.time()
        logger.debug("💾 Cache saved")
    except Exception as e:
        logger.warning(f"⚠️ Cache save error: {e}")

def get_rewrite_key(question: str, history: List[dict]) -> str:
    """Tạo cache key cho query rewriting"""
    history_str = json.dumps(history[-4:], sort_keys=True)  # ✅ Lấy 4 tin nhắn
    combined = f"{question}|||{history_str}"
    return hashlib.md5(combined.encode()).hexdigest()

def get_answer_key(search_query: str, products: List[dict], original_question: str) -> str:
    """Tạo cache key cho answer - bao gồm cả câu hỏi gốc để tránh conflict"""
    product_ids = sorted([p['id'] for p in products])
    # ✅ Thêm original_question để đảm bảo unique
    combined = f"{search_query}|||{original_question}|||{json.dumps(product_ids)}"
    return hashlib.md5(combined.encode()).hexdigest()

# --- CACHE TTL ---
ANSWER_CACHE_TTL_SECONDS = int(os.getenv("ANSWER_CACHE_TTL_HOURS", "24")) * 3600   # Mặc định 24 giờ
REWRITE_CACHE_TTL_SECONDS = int(os.getenv("REWRITE_CACHE_TTL_DAYS", "7")) * 86400  # Mặc định 7 ngày

def _cache_get(cache: OrderedDict, key: str, ttl: int) -> Optional[str]:
    """Lấy giá trị từ cache, trả về None nếu hết hạn hoặc không tồn tại."""
    entry = cache.get(key)
    if entry is None:
        return None
    if isinstance(entry, str):  # Tương thích định dạng cũ (không có TTL)
        return entry
    if isinstance(entry, dict):
        if time.time() - entry.get("ts", 0) > ttl:
            del cache[key]
            return None
        cache.move_to_end(key)
        return entry.get("v")
    return None

def _cache_set(cache: OrderedDict, key: str, value: str):
    """Lưu giá trị vào cache kèm timestamp."""
    cache[key] = {"v": value, "ts": time.time()}
    cache.move_to_end(key)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 AI Server V3.5 starting fast mode (OpenAI API - {OPENAI_MODEL})...")
    load_caches()

    logger.info("✅ Server started. Graph Engine will lazy-load on first request.")

    yield

    save_caches(force=True)
    logger.info("🛑 Đang tắt AI Server...")

app = FastAPI(
    title="Smart E-commerce Chatbot V3.5",
    version="3.5.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

# --- MODELS ---
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    history: Optional[List[dict]] = Field(default=[], max_items=20)
    top_k: Optional[int] = Field(default=5, ge=1, le=20)
    
    @validator('history')  # ✅ Thêm validation
    def validate_history(cls, v):
        if not v:
            return []
        for item in v:
            if not isinstance(item, dict):
                raise ValueError("History items must be dictionaries")
            if 'role' not in item or 'content' not in item:
                raise ValueError("History items must have 'role' and 'content' keys")
        return v

class ProductResponse(BaseModel):
    id: int
    name: str
    category: str
    price: Optional[int]
    rating: float
    description: str
    image: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    products: List[ProductResponse]
    processing_time: float

# --- HELPERS ---
def format_product_for_frontend(product: dict) -> dict:
    """Format product để frontend dùng - trả về dict để có thể thêm score"""
    return {
        'id': product.get('id'),
        'name': product.get('name', ''),
        'category': product.get('category', 'Khác'),
        'price': product.get('price'),
        'rating': product.get('rating', 0.0),
        'description': product.get('description', '')[:200],
        'image': product.get('image'),
        'score': product.get('score', 0.0)  # Thêm score từ GraphRAG
    }

def extract_review_text(full_text: str) -> str:
    """Trích xuất review an toàn"""
    if not full_text:
        return "Chưa có đánh giá."
    try:
        if "Thông tin từ người dùng:" in full_text:
            parts = full_text.split("Thông tin từ người dùng:")
            if len(parts) > 1:
                return parts[-1].strip()[:100]
        elif "Đánh giá:" in full_text:
            parts = full_text.split("Đánh giá:")
            if len(parts) > 1:
                return parts[-1].strip()[:100]
    except Exception:
        pass
    return "Chưa có đánh giá."

def build_context_text(products: List[dict]) -> str:
    """Xây dựng context text"""
    context = ""
    for i, p in enumerate(products, 1):
        price = f"{p.get('price', 0):,}đ" if p.get('price') else "Liên hệ"
        review = extract_review_text(p.get('full_text', ''))
        context += f"[SP{i}] **{p.get('name')}** | Giá: {price} | Rating: {p.get('rating', 0)}/5\n   - Review: {review}\n"
    return context

def should_rewrite_query(question: str, history: List[dict]) -> bool:
    if not history:
        return False
    question_lower = (question or "").lower()
    if len(question_lower.split()) >= 6:
        return False
    pronoun_cues = [
        "nó", "cái đó", "loại đó", "mẫu đó", "cái này",
        "mẫu này", "sp đó", "sp này", "loại kia"
    ]
    return any(cue in question_lower for cue in pronoun_cues)

async def rewrite_query(user_question: str, history: List[dict]) -> str:
    """Rewrite query với cache - sử dụng OpenAI"""
    if not history:
        return user_question
    
    cache_key = get_rewrite_key(user_question, history)
    
    # Kiểm tra cache với TTL
    cached_rewrite = _cache_get(rewrite_cache, cache_key, REWRITE_CACHE_TTL_SECONDS)
    if cached_rewrite is not None:
        logger.info(f"🧠 [REWRITE CACHE HIT] '{user_question}' -> '{cached_rewrite}'")
        return cached_rewrite
    
    short_history = history[-4:]
    prompt = f"""Viết lại câu hỏi tìm kiếm sản phẩm dựa trên lịch sử (Giữ nguyên nếu là chào hỏi/topic mới).

Lịch sử: {short_history}
Câu hỏi: "{user_question}"
Trả về câu hỏi viết lại (không giải thích):"""
    
    try:
        # Sử dụng OpenAI API
        response = await OPENAI_CLIENT.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=100
        )
        
        rewritten = response.choices[0].message.content.strip()
        
        if not rewritten:
            return user_question
        
        # Lưu cache với TTL
        _cache_set(rewrite_cache, cache_key, rewritten)
        global _cache_dirty
        _cache_dirty = True
        save_caches()  # Debounced save
        
        return rewritten
    except Exception as e:
        logger.warning(f"⚠️ Rewrite failed: {e}")
        return user_question

async def generate_answer_with_retry(prompt: str, max_retries: int = 3) -> str:
    """Generate answer với retry - sử dụng OpenAI"""
    for attempt in range(max_retries):
        try:
            # Sử dụng OpenAI API với system message
            response = await OPENAI_CLIENT.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "Bạn là tư vấn viên chuyên nghiệp, thân thiện và am hiểu về sản phẩm điện tử. Chỉ dùng thông tin trong context được cung cấp; nếu thiếu thông tin, hãy nói rõ là chưa có dữ liệu thay vì suy đoán."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=600
            )
            
            answer = response.choices[0].message.content.strip()
            
            if not answer or len(answer) < 10:
                raise ValueError("Câu trả lời quá ngắn")
            
            return answer
            
        except Exception as e:
            error_msg = str(e).lower()
            # Xử lý rate limit
            if "rate limit" in error_msg or "429" in error_msg:
                wait_time = 2 * (attempt + 1)
                logger.warning(f"⚠️ Rate limit, đợi {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"❌ OpenAI Error (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff
    
    raise Exception("Không thể tạo câu trả lời sau nhiều lần thử")

# --- ENDPOINTS ---
@app.get("/")
async def root():
    return {
        "service": "Smart E-commerce Chatbot API",
        "version": "3.5.0",
        "status": "running",
        "model": OPENAI_MODEL
    }

@app.get("/health")  # ✅ Thêm health check
async def health_check():
    return {
        "status": "healthy" if rag_engine else "initializing",
        "engine_ready": rag_engine is not None,
        "version": "3.5.0",
        "model": OPENAI_MODEL,
        "cache_stats": {
            "rewrite_cache_size": len(rewrite_cache),
            "answer_cache_size": len(answer_cache)
        }
    }

@app.get("/health/engine")
async def engine_health():
    if not rag_engine:
        raise HTTPException(status_code=503, detail="Graph Engine chưa khởi động")
    try:
        return {
            "status": "ready",
            "products_count": len(rag_engine.products) if hasattr(rag_engine, 'products') else 0,
            "graph_nodes": rag_engine.graph.number_of_nodes() if hasattr(rag_engine, 'graph') else 0,
            "graph_edges": rag_engine.graph.number_of_edges() if hasattr(rag_engine, 'graph') else 0,
            "cache_stats": {
                "rewrite_cache_size": len(rewrite_cache),
                "answer_cache_size": len(answer_cache)
            }
        }
    except Exception as e:
        logger.error(f"Lỗi khi kiểm tra engine health: {e}")
        raise HTTPException(status_code=500, detail="Lỗi khi kiểm tra engine")

@app.post("/chat", response_model=ChatResponse)
@limiter.limit("15/minute")
async def chat_endpoint(request: Request, chat_req: ChatRequest):
    """Endpoint chính với full caching"""
    global _cache_dirty  # ✅ Di chuyển lên đầu hàm
    
    start_time = time.time()
    
    engine = await get_rag_engine()

    try:
        # ✅ 0. KIỂM TRA CÂU CHÀO TRƯỚC (tránh gọi OpenAI không cần thiết)
        keywords_skip = ["xin chào", "hello", "hi", "tạm biệt", "cảm ơn", "bye", "goodbye"]
        is_greeting = any(k in chat_req.question.lower() for k in keywords_skip) and len(chat_req.question.split()) < 4
        
        if is_greeting:
            # Câu chào → bỏ qua rewrite và search, trả lời ngay
            logger.info(f"👋 Phát hiện câu chào: '{chat_req.question}'")
            products = []
            
            # Kiểm tra cache cho câu trả lời chào hỏi
            answer_key = get_answer_key("", products, chat_req.question)
            ai_answer = _cache_get(answer_cache, answer_key, ANSWER_CACHE_TTL_SECONDS)
            if ai_answer is None:
                # Tạo câu trả lời chào hỏi đơn giản (không cần gọi OpenAI)
                greeting_responses = {
                    "xin chào": "Xin chào! Tôi có thể giúp gì cho bạn? 😊",
                    "hello": "Hello! How can I help you today? 😊",
                    "hi": "Hi there! What are you looking for? 😊",
                    "tạm biệt": "Tạm biệt! Chúc bạn một ngày tốt lành! 👋",
                    "cảm ơn": "Không có gì! Rất vui được giúp đỡ bạn! 😊",
                    "bye": "Goodbye! Have a great day! 👋",
                    "goodbye": "Goodbye! Take care! 👋"
                }
                
                query_lower = chat_req.question.lower()
                ai_answer = greeting_responses.get(query_lower, "Xin chào! Tôi có thể giúp gì cho bạn? 😊")
                
                # Cache câu trả lời
                _cache_set(answer_cache, answer_key, ai_answer)
                _cache_dirty = True
                save_caches()
            
            formatted_products = []
            return ChatResponse(
                answer=ai_answer,
                products=formatted_products,
                processing_time=round(time.time() - start_time, 2)
            )
        
        # 1. REWRITE (chỉ khi không phải câu chào)
        search_query = chat_req.question
        if should_rewrite_query(chat_req.question, chat_req.history):
            search_query = await rewrite_query(chat_req.question, chat_req.history)
        
        # 2. RETRIEVE
        logger.info(f"🔍 Searching: {search_query}")
        products = engine.retrieve(search_query, top_k=chat_req.top_k)
        best_score = max((p.get("score", 0.0) for p in products), default=0.0)
        low_confidence = best_score < 0.35

        # 3. GENERATE ANSWER (CÓ CACHE)
        ai_answer = ""
        
        # ✅ Cache key bao gồm cả original_question
        answer_key = get_answer_key(search_query, products, chat_req.question)
        
        ai_answer_cached = _cache_get(answer_cache, answer_key, ANSWER_CACHE_TTL_SECONDS)
        if ai_answer_cached is not None:
            logger.info("💎 [ANSWER CACHE HIT] Lấy câu trả lời từ Cache (Không tốn API)")
            ai_answer = ai_answer_cached
        else:
            # Chưa có cache → gọi OpenAI
            if not products:
                prompt = f"""Bạn là tư vấn viên chuyên nghiệp của cửa hàng điện tử.

Khách hàng nói: "{chat_req.question}"

Hãy trả lời thân thiện và hỏi lại 2-3 câu để làm rõ nhu cầu (hãng, mức giá, nhu cầu chính, kích thước/ tính năng)."""
            elif low_confidence:
                context = build_context_text(products)
                prompt = f"""Bạn là tư vấn viên chuyên nghiệp của cửa hàng điện tử. Không bịa thông tin ngoài context.

Khách hàng nói: "{chat_req.question}"

Sản phẩm tham khảo (chưa chắc đúng hoàn toàn):
{context}

Hãy trả lời thân thiện và hỏi lại 2-3 câu để làm rõ nhu cầu (hãng, mức giá, nhu cầu chính, kích thước/ tính năng). Nếu đề xuất sản phẩm, chỉ nêu 1-2 sản phẩm và nói rõ đây là gợi ý tạm thời."""
            else:
                context = build_context_text(products)
                num_products = len(products)
                
                prompt = f"""Bạn là tư vấn viên chuyên nghiệp của cửa hàng điện tử. Tư vấn sản phẩm một cách ngắn gọn, rõ ràng và hữu ích. Không bịa thông tin ngoài context.

Khách hàng hỏi: "{chat_req.question}"

Sản phẩm phù hợp:
{context}

YÊU CẦU FORMAT (PHẢI TUÂN THỦ):
1. Câu mở đầu ngắn gọn, thân thiện (1 câu)
2. Xuống dòng, rồi liệt kê sản phẩm với format CHÍNH XÁC này (mỗi sản phẩm 1 dòng riêng biệt):
   • Tên sản phẩm - Giá: X,XXX,XXXđ - Rating: X.X/5
3. Xuống dòng, rồi {'so sánh ngắn gọn điểm khác biệt chính về giá, tính năng (2-3 câu)' if num_products > 1 else 'mô tả ngắn gọn điểm nổi bật, phù hợp với ai (1-2 câu)'}
4. Xuống dòng, rồi lời khuyên 💡 ngắn gọn (1 câu)

QUAN TRỌNG VỀ FORMAT:
- DÙNG bullet points (•), KHÔNG dùng số thứ tự (1, 2, 3...)
- Mỗi sản phẩm phải XUỐNG DÒNG RIÊNG BIỆT 
- Giữa các phần (mở đầu, danh sách, so sánh, lời khuyên) PHẢI XUỐNG DÒNG 
- Tổng độ dài: {'150-200 từ' if num_products > 1 else '100-150 từ'}
- Ngắn gọn, súc tích, không lặp lại, dễ đọc"""
            
            try:
                ai_answer = await generate_answer_with_retry(prompt)
                
                # Lưu vào cache
                if ai_answer and len(ai_answer) > 10:
                    _cache_set(answer_cache, answer_key, ai_answer)
                    _cache_dirty = True
                    save_caches()  # Debounced save
                    
            except Exception as e:
                logger.error(f"❌ OpenAI Failed: {e}")
                # Fallback
                if products:
                    names = [p['name'] for p in products[:3]]
                    ai_answer = f"Dưới đây là các sản phẩm phù hợp: {', '.join(names)}. (Hệ thống AI đang bận)"
                else:
                    ai_answer = "Xin chào! Bạn cần tìm gì ạ?"

        formatted_products = [format_product_for_frontend(p) for p in products]
        
        # Convert dict to ProductResponse cho ChatResponse (bỏ score vì không có trong model)
        product_responses = [
            ProductResponse(
                id=p['id'],
                name=p['name'],
                category=p['category'],
                price=p['price'],
                rating=p['rating'],
                description=p['description'],
                image=p.get('image')
            ) for p in formatted_products
        ]
        
        return ChatResponse(
            answer=ai_answer,
            products=product_responses,
            processing_time=round(time.time() - start_time, 2)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Server Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau."
        )

@app.post("/search")
@limiter.limit("30/minute")
async def search_endpoint(request: Request):
    """Endpoint cho search - trả về products không có answer"""
    engine = await get_rag_engine()
    
    try:
        body = await request.json()
        query = body.get('query', '')
        top_k = body.get('top_k', 20)
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Dùng retrieve trực tiếp từ GraphRAG
        products = engine.retrieve(query, top_k=top_k)
        
        # Format products để frontend dùng
        formatted_products = [format_product_for_frontend(p) for p in products]
        
        return {
            "success": True,
            "results": formatted_products,  # Đã là dict rồi
            "count": len(formatted_products)
        }
    except Exception as e:
        logger.error(f"❌ Search Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search error")

@app.post("/reload")
async def reload_engine(request: Request):
    """Tải lại GraphRAG engine từ knowledge_base.json (không cần restart server)."""
    global rag_engine, answer_cache, _cache_dirty

    reload_secret = os.getenv("RELOAD_SECRET", "")
    if reload_secret:
        body = await request.json()
        if body.get("secret") != reload_secret:
            raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Xóa embeddings cache để force re-vectorization
        embeddings_cache = CACHE_DIR / "product_embeddings_multilingual.pkl"
        if embeddings_cache.exists():
            embeddings_cache.unlink()
            logger.info("🗑️ Đã xóa embeddings cache")

        # Tải lại engine trong thread pool (không block event loop)
        logger.info("🔄 Đang tải lại Graph Engine...")
        loop = asyncio.get_running_loop()
        new_engine = await loop.run_in_executor(None, GraphRAG)
        rag_engine = new_engine

        # Xóa answer cache (dữ liệu mới → câu trả lời cũ không còn hợp lệ)
        old_size = len(answer_cache)
        answer_cache.clear()
        _cache_dirty = True
        save_caches(force=True)

        logger.info(f"✅ Reload thành công: {len(rag_engine.products)} sản phẩm, đã xóa {old_size} cache entries")
        return {
            "success": True,
            "products_count": len(rag_engine.products),
            "cleared_cache_entries": old_size
        }
    except Exception as e:
        logger.error(f"❌ Reload thất bại: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Reload thất bại: {str(e)}")


@app.post("/chat/stream")
@limiter.limit("10/minute")
async def chat_stream_endpoint(request: Request, chat_req: ChatRequest):
    """Streaming chat endpoint - trả về token từng chữ qua Server-Sent Events."""
    engine = await get_rag_engine()

    search_query = chat_req.question
    if should_rewrite_query(chat_req.question, chat_req.history):
        search_query = await rewrite_query(chat_req.question, chat_req.history)

    products = engine.retrieve(search_query, top_k=chat_req.top_k)

    if not products:
        prompt = f"""Bạn là tư vấn viên chuyên nghiệp. Khách nói: '{chat_req.question}'. Trả lời thân thiện và hướng dẫn tìm kiếm phù hợp hơn."""
    else:
        context = build_context_text(products)
        prompt = f"""Bạn là tư vấn viên chuyên nghiệp. Tư vấn ngắn gọn, rõ ràng.

Khách hỏi: "{chat_req.question}"

Sản phẩm:
{context}

Tư vấn trong 3-5 câu, dùng bullet (•), đề xuất sản phẩm cụ thể."""

    formatted_products = [format_product_for_frontend(p) for p in products]

    async def event_stream():
        yield f"data: {json.dumps({'type': 'products', 'products': formatted_products}, ensure_ascii=False)}\n\n"
        try:
            stream = await OPENAI_CLIENT.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Bạn là tư vấn viên chuyên nghiệp của cửa hàng điện tử."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=600,
                stream=True
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'type': 'token', 'content': delta}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"❌ Stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Lỗi khi generate response'})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)