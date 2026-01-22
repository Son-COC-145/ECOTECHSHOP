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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager"""
    global rag_engine
    logger.info(f"🚀 Đang khởi động AI Server V3.5 (OpenAI API - {OPENAI_MODEL})...")
    load_caches()
    
    # Kiểm tra kết nối OpenAI API
    try:
        test_response = await OPENAI_CLIENT.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5
        )
        logger.info(f"✅ Kết nối OpenAI API thành công!")
        logger.info(f"✅ Sử dụng model: {OPENAI_MODEL}")
    except Exception as e:
        logger.error(f"❌ Lỗi kết nối OpenAI API: {e}")
        logger.error("⚠️ Vui lòng kiểm tra OPENAI_API_KEY trong file .env")
        logger.error("⚠️ Lấy API key tại: https://platform.openai.com/api-keys")
        raise
    
    try:
        rag_engine = GraphRAG()
        logger.info("✅ Graph Engine đã load thành công!")
    except Exception as e:
        logger.error(f"❌ Lỗi Graph Engine: {e}")
        raise
    
    yield
    
    save_caches(force=True)  # Force save khi shutdown
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

async def rewrite_query(user_question: str, history: List[dict]) -> str:
    """Rewrite query với cache - sử dụng OpenAI"""
    if not history:
        return user_question
    
    cache_key = get_rewrite_key(user_question, history)
    
    # Kiểm tra cache (và move to end để LRU)
    if cache_key in rewrite_cache:
        # Move to end (most recently used)
        rewrite_cache.move_to_end(cache_key)
        logger.info(f"🧠 [REWRITE CACHE HIT] '{user_question}' -> '{rewrite_cache[cache_key]}'")
        return rewrite_cache[cache_key]
    
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
        
        # Lưu cache (và move to end)
        rewrite_cache[cache_key] = rewritten
        rewrite_cache.move_to_end(cache_key)
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
                    {"role": "system", "content": "Bạn là tư vấn viên chuyên nghiệp, thân thiện và am hiểu về sản phẩm điện tử. Bạn luôn tư vấn chi tiết, cụ thể và có ích cho khách hàng."},
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
    
    if not rag_engine:
        raise HTTPException(status_code=503, detail="Server starting...")

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
            if answer_key in answer_cache:
                answer_cache.move_to_end(answer_key)
                ai_answer = answer_cache[answer_key]
            else:
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
                answer_cache[answer_key] = ai_answer
                answer_cache.move_to_end(answer_key)
                _cache_dirty = True  # ✅ Đã khai báo global ở đầu hàm
                save_caches()
            
            formatted_products = []
            return ChatResponse(
                answer=ai_answer,
                products=formatted_products,
                processing_time=round(time.time() - start_time, 2)
            )
        
        # 1. REWRITE (chỉ khi không phải câu chào)
        search_query = chat_req.question
        if chat_req.history:
            search_query = await rewrite_query(chat_req.question, chat_req.history)
        
        # 2. RETRIEVE
        logger.info(f"🔍 Searching: {search_query}")
        products = rag_engine.retrieve(search_query, top_k=chat_req.top_k)

        # 3. GENERATE ANSWER (CÓ CACHE)
        ai_answer = ""
        
        # ✅ Cache key bao gồm cả original_question
        answer_key = get_answer_key(search_query, products, chat_req.question)
        
        if answer_key in answer_cache:
            # Move to end (LRU)
            answer_cache.move_to_end(answer_key)
            logger.info("💎 [ANSWER CACHE HIT] Lấy câu trả lời từ Cache (Không tốn API)")
            ai_answer = answer_cache[answer_key]
        else:
            # Chưa có cache → gọi OpenAI
            if not products:
                prompt = f"""Bạn là tư vấn viên chuyên nghiệp của cửa hàng điện tử. Khách hàng nói: '{chat_req.question}'. 

Trả lời thân thiện, xác nhận nhu cầu của khách và hướng dẫn họ cách tìm kiếm sản phẩm phù hợp hơn."""
            else:
                context = build_context_text(products)
                num_products = len(products)
                
                prompt = f"""Bạn là tư vấn viên chuyên nghiệp của cửa hàng điện tử. Tư vấn sản phẩm một cách ngắn gọn, rõ ràng và hữu ích.

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
                    answer_cache[answer_key] = ai_answer
                    answer_cache.move_to_end(answer_key)
                    _cache_dirty = True  # ✅ Đã khai báo global ở đầu hàm
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
    if not rag_engine:
        raise HTTPException(status_code=503, detail="Server starting...")
    
    try:
        body = await request.json()
        query = body.get('query', '')
        top_k = body.get('top_k', 20)
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Dùng retrieve trực tiếp từ GraphRAG
        products = rag_engine.retrieve(query, top_k=top_k)
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)