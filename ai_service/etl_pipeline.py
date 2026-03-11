"""ETL Pipeline: Extract data from MySQL and build knowledge_base.json for GraphRAG."""

import os
import json
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


load_dotenv()


def get_db_engine() -> Engine:
    db_type = (os.getenv("DB_TYPE", "mysql") or "mysql").lower().strip()
    if db_type != "mysql":
        raise ValueError("ETL hiện hỗ trợ MySQL. Hãy đặt DB_TYPE=mysql")

    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "3306"))
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD") or os.getenv("DB_PASS") or ""
    database = os.getenv("DB_NAME") or os.getenv("DB_DATABASE") or "ecodb"

    url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?charset=utf8mb4"
    return create_engine(url, pool_pre_ping=True)


def extract_data(engine: Engine):
    print("\n📊 Đang trích xuất dữ liệu từ MySQL...")

    query_products = """
    SELECT
        p.productId,
        p.name,
        p.description,
        p.stock,
        p.rating,
        p.sold,
        c.name AS category,
        pa.name AS spec_name,
        pav.value AS spec_value
    FROM Product p
    LEFT JOIN Category c ON p.categoryId = c.categoryId
    LEFT JOIN ProductAttributeValue pav ON p.productId = pav.productId
    LEFT JOIN ProductAttribute pa ON pav.attributeId = pa.attributeId
    """
    df_products = pd.read_sql(query_products, engine)

    query_prices = """
    SELECT
        productId,
        MIN(optionPrice) AS min_price,
        MAX(optionPrice) AS max_price
    FROM ProductPrice
    GROUP BY productId
    """
    df_prices = pd.read_sql(query_prices, engine)

    query_reviews = """
    SELECT
        productId,
        AVG(CAST(rating AS DECIMAL(10,2))) AS avg_rating,
        COUNT(reviewId) AS total_reviews
    FROM Review
    GROUP BY productId
    """
    df_reviews = pd.read_sql(query_reviews, engine)

    query_comments_top3 = """
    SELECT
      productId,
      GROUP_CONCAT(comment ORDER BY createdAt DESC SEPARATOR ' | ') AS sample_comments
    FROM (
      SELECT
        productId, comment, createdAt,
        ROW_NUMBER() OVER (PARTITION BY productId ORDER BY createdAt DESC) AS rn
      FROM Review
      WHERE comment IS NOT NULL AND TRIM(comment) <> ''
    ) t
    WHERE rn <= 3
    GROUP BY productId
    """

    try:
        df_comments = pd.read_sql(query_comments_top3, engine)
    except Exception as e:
        print(f"⚠️ Không lấy được top-3 comments (MySQL < 8.0?). Fallback: {e}")
        df_comments = pd.read_sql(
            """
            SELECT
              productId,
              GROUP_CONCAT(comment ORDER BY createdAt DESC SEPARATOR ' | ') AS sample_comments
            FROM Review
            WHERE comment IS NOT NULL AND TRIM(comment) <> ''
            GROUP BY productId
            """,
            engine,
        )

    query_images = """
    SELECT
        productId,
        imageUrl,
        color
    FROM ProductImage
    WHERE isPrimary = 1 OR isPrimary IS NULL
    """
    df_images = pd.read_sql(query_images, engine)

    return df_products, df_prices, df_reviews, df_comments, df_images


def transform_data(df_products, df_prices, df_reviews, df_comments, df_images):
    print("\n🔄 Đang xử lý và ghép nối dữ liệu...")

    final_list = []

    price_by_product = {}
    if not df_prices.empty:
        for _, row in df_prices.iterrows():
            product_id = int(row["productId"])
            min_price = row.get("min_price")
            price_by_product[product_id] = float(min_price) if pd.notna(min_price) else None

    reviews_by_product = {}
    if not df_reviews.empty:
        for _, row in df_reviews.iterrows():
            product_id = int(row["productId"])
            reviews_by_product[product_id] = {
                "avg_rating": float(row["avg_rating"]) if pd.notna(row["avg_rating"]) else 0.0,
                "total_reviews": int(row["total_reviews"]) if pd.notna(row["total_reviews"]) else 0,
            }

    comments_by_product = {}
    if not df_comments.empty:
        for _, row in df_comments.iterrows():
            product_id = int(row["productId"])
            sample = row.get("sample_comments")
            comments_by_product[product_id] = str(sample) if pd.notna(sample) else ""

    images_by_product = {}
    if not df_images.empty:
        for _, row in df_images.iterrows():
            product_id = int(row["productId"])
            image_url = row.get("imageUrl")
            if pd.notna(image_url) and product_id not in images_by_product:
                images_by_product[product_id] = str(image_url)

    grouped = df_products.groupby("productId")

    for product_id, group in grouped:
        product_id = int(product_id)
        first = group.iloc[0]

        specs = []
        specs_text = []
        for _, row in group.iterrows():
            if pd.notna(row.get("spec_name")) and pd.notna(row.get("spec_value")):
                key = str(row["spec_name"]).strip()
                value = str(row["spec_value"]).strip()
                specs.append({"key": key, "value": value})
                specs_text.append(f"{key}: {value}")

        product_name = str(first.get("name")) if pd.notna(first.get("name")) else ""
        category = str(first.get("category")) if pd.notna(first.get("category")) else ""
        description = str(first.get("description")) if pd.notna(first.get("description")) else ""
        stock = int(first.get("stock")) if pd.notna(first.get("stock")) else 0
        sold = int(first.get("sold")) if pd.notna(first.get("sold")) else 0

        price = price_by_product.get(product_id)
        image_url = images_by_product.get(product_id)

        base_rating = float(first.get("rating")) if pd.notna(first.get("rating")) else 0.0
        review_info = reviews_by_product.get(product_id)
        avg_rating = review_info["avg_rating"] if review_info else base_rating
        total_reviews = review_info["total_reviews"] if review_info else 0

        sample_comments = comments_by_product.get(product_id, "")
        review_text = "Chưa có đánh giá."
        if total_reviews > 0:
            review_text = f"Đánh giá trung bình {avg_rating:.1f}/5 sao ({total_reviews} đánh giá)."
            if sample_comments:
                review_text += f" Một số nhận xét: {sample_comments[:300]}..."

        full_text_parts = []
        if product_name:
            full_text_parts.append(f"Sản phẩm: {product_name}")
        if category:
            full_text_parts.append(f"Danh mục: {category}")
        if price is not None:
            full_text_parts.append(f"Giá: {int(price):,} VNĐ")
        if description:
            full_text_parts.append(f"Mô tả: {description}")
        if specs_text:
            full_text_parts.append(f"Thông số kỹ thuật: {'; '.join(specs_text)}")
        if stock > 0:
            full_text_parts.append(f"Tồn kho: {stock} sản phẩm")
        full_text_parts.append(f"Đánh giá: {review_text}")

        full_text = ". ".join(full_text_parts) + "."

        final_list.append(
            {
                "id": product_id,
                "name": product_name,
                "category": category,
                "image": image_url,
                "price": int(price) if price is not None else None,
                "stock": stock,
                "rating": float(avg_rating),
                "sold": sold,
                "description": description,
                "full_text": full_text,
                "metadata": {
                    "rating": float(avg_rating),
                    "total_reviews": int(total_reviews),
                    "specs": specs,
                },
            }
        )

    return final_list


def main():
    engine: Engine | None = None
    try:
        base_dir = Path(__file__).resolve().parent
        engine = get_db_engine()
        print("✅ Kết nối MySQL thành công")

        df_p, df_prices, df_r, df_c, df_i = extract_data(engine)
        data = transform_data(df_p, df_prices, df_r, df_c, df_i)

        output_path = base_dir / "data" / "knowledge_base.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"\n✅ THÀNH CÔNG! Đã tạo file '{output_path}' với {len(data)} sản phẩm.")

        # Xóa cache lỗi thời để server tải lại dữ liệu mới
        cache_dir = base_dir / "data" / "cache"
        for cache_file in ["answer_cache.json", "product_embeddings_multilingual.pkl"]:
            f = cache_dir / cache_file
            if f.exists():
                f.unlink()
                print(f"🗑️ Đã xóa {cache_file}")
        print("💡 Gọi POST /reload để cập nhật server mà không cần restart.")
    finally:
        if engine is not None:
            engine.dispose()
            print("\n🔌 Đã đóng kết nối database")


if __name__ == "__main__":
    main()