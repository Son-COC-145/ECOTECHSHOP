cd ai_service

## Yêu cầu

- Windows: khuyến nghị **Python 3.11 (x64)**. Nếu dùng Python 3.13, nhiều package ML (numpy/pandas/scikit-learn/torch) có thể không có wheel và sẽ lỗi khi pip phải build từ source.

# Kích hoạt môi trường ảo (Bắt buộc)
.\venv\Scripts\activate

# Chạy server
uvicorn main:app --reload --port 8000