const axios = require("axios");
const { getPool } = require("../config/db");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

async function attachProductPrices(pool, products) {
  const list = Array.isArray(products) ? products : [];
  const productIds = list.map((p) => Number(p?.productId)).filter(Boolean);
  if (!productIds.length) return list;

  const placeholders = productIds.map(() => "?").join(",");
  const [prices] = await pool.execute(
    `SELECT * FROM ProductPrice WHERE productId IN (${placeholders})`,
    productIds
  );

  const byProductId = new Map();
  for (const price of prices || []) {
    const pid = Number(price.productId);
    if (!byProductId.has(pid)) byProductId.set(pid, []);
    byProductId.get(pid).push(price);
  }

  return list.map((p) => ({
    ...p,
    productPrices: byProductId.get(Number(p.productId)) || [],
  }));
}

async function fallbackSqlSearch(pool, q, limit = 20) {
  const keywords = q.trim().split(/\s+/).filter(Boolean);
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 20;
  
  if (keywords.length === 0) {
    return [];
  }

  // Tạo điều kiện OR cho mỗi từ khóa
  const conditions = keywords.map(() => 
    `(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)`
  ).join(' OR ');

  const params = keywords.flatMap(kw => {
    const pattern = `%${kw}%`;
    return [pattern, pattern, pattern];
  });

  const [rows] = await pool.execute(
    `
    SELECT p.*, c.name AS categoryName,
           (
             ${keywords.map(() => `(CASE WHEN p.name LIKE ? THEN 3 ELSE 0 END)`).join(' + ')} +
             ${keywords.map(() => `(CASE WHEN c.name LIKE ? THEN 2 ELSE 0 END)`).join(' + ')} +
             ${keywords.map(() => `(CASE WHEN p.description LIKE ? THEN 1 ELSE 0 END)`).join(' + ')}
           ) AS relevance
    FROM Product p
    LEFT JOIN Category c ON p.categoryId = c.categoryId
    WHERE ${conditions}
    ORDER BY relevance DESC, p.productId DESC
    LIMIT ${safeLimit}
    `,
    [
      // Params cho relevance scoring
      ...keywords.flatMap(kw => [`%${kw}%`]),
      ...keywords.flatMap(kw => [`%${kw}%`]),
      ...keywords.flatMap(kw => [`%${kw}%`]),
      // Params cho WHERE conditions
      ...params
    ]
  );
  
  return rows;
}

exports.semanticSearch = async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);

    const pool = getPool();

    // ✅ Dùng GraphRAG từ AI Service
    let aiProducts = [];
    try {
      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/search`,
        { query: q, top_k: 20 },
        { timeout: 10000 }
      );
      aiProducts = aiResponse.data?.results || [];
    } catch (aiErr) {
      // Nếu AI service chưa chạy / thiếu OPENAI_API_KEY => fallback SQL để search vẫn hoạt động
      console.warn("semanticSearch: AI service unavailable, fallback SQL search", {
        message: aiErr.message,
        code: aiErr.code,
      });
      const fallbackRows = await fallbackSqlSearch(pool, q, 20);
      const enriched = await attachProductPrices(pool, fallbackRows);
      return res.json(enriched);
    }

    if (aiProducts.length === 0) {
      const fallbackRows = await fallbackSqlSearch(pool, q, 20);
      const enriched = await attachProductPrices(pool, fallbackRows);
      return res.json(enriched);
    }

    const productIds = aiProducts.map((p) => Number(p.id)).filter(Boolean);
    if (!productIds.length) return res.json([]);

    const placeholders = productIds.map(() => "?").join(",");

    const [rows] = await pool.execute(
      `
      SELECT p.*, c.name AS categoryName
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.categoryId
      WHERE p.productId IN (${placeholders})
      `,
      productIds
    );

    // giữ đúng thứ tự theo AI
    const byId = new Map(rows.map((r) => [Number(r.productId), r]));
    const ordered = productIds.map((id) => byId.get(id)).filter(Boolean);

    const enrichedOrdered = await attachProductPrices(pool, ordered);

    // nếu AI trả id mà DB không có, vẫn fallback nhẹ
    if (ordered.length === 0) {
      const fallbackRows = await fallbackSqlSearch(pool, q, 20);
      const enrichedFallback = await attachProductPrices(pool, fallbackRows);
      return res.json(enrichedFallback);
    }

    return res.json(enrichedOrdered);
  } catch (err) {
    console.error("semanticSearch error:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};