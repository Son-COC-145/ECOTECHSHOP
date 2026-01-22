require("dotenv").config();

const { connectDB, getPool } = require("../config/db");
const { loadWord2Vec, getSentenceVector } = require("../utils/word2vecSearch");
const { saveProductEmbedding } = require("../services/ProductEmbeddingService");

async function main() {
  try {
    // 1) Kết nối MySQL (tạo pool)
    await connectDB();
    const pool = getPool();

    // 2) Load model Word2Vec
    await loadWord2Vec();
    console.log("📘 Word2Vec loaded");

    // 3) Lấy danh sách sản phẩm
    const [rows] = await pool.execute(`SELECT productId, name FROM Product`);
    console.log("🔍 Tổng sản phẩm:", rows.length);

    // 4) Tạo embedding cho từng tên
    for (const p of rows) {
      const vector = getSentenceVector(p.name);

      if (!vector) {
        console.log("⚠ Không tạo embedding cho:", p.name);
        continue;
      }

      await saveProductEmbedding(p.productId, vector);
      console.log("✅ Saved embedding:", p.productId, p.name);
    }

    console.log("🎉 DONE generate embeddings");
    process.exit(0);
  } catch (e) {
    console.error("❌ generateEmbedding error:", e);
    process.exit(1);
  }
}

main();