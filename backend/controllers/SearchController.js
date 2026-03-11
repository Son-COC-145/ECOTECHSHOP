const axios = require("axios");
const { getPool } = require("../config/db");
const { correctQuery } = require("../utils/spellCorrection");

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

async function fallbackSqlSearch(pool, q, limit = 200) {
  const keywords = q.trim().split(/\s+/).filter(Boolean);
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 200;

  if (keywords.length === 0) return [];

  const scoreExpr = [
    ...keywords.map(() => `(CASE WHEN p.name LIKE ? THEN 3 ELSE 0 END)`),
    ...keywords.map(() => `(CASE WHEN c.name LIKE ? THEN 2 ELSE 0 END)`),
    ...keywords.map(() => `(CASE WHEN p.description LIKE ? THEN 1 ELSE 0 END)`),
  ].join(' + ');

  const scoreParams = [
    ...keywords.flatMap(kw => [`%${kw}%`]),
    ...keywords.flatMap(kw => [`%${kw}%`]),
    ...keywords.flatMap(kw => [`%${kw}%`]),
  ];

  // Ưu tiên AND (tất cả từ khoá xuất hiện) → chính xác hơn
  const andConditions = keywords
    .map(() => `(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)`)
    .join(' AND ');
  const andParams = keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`, `%${kw}%`]);

  const [andRows] = await pool.execute(
    `SELECT p.*, c.name AS categoryName, (${scoreExpr}) AS relevance
     FROM Product p
     LEFT JOIN Category c ON p.categoryId = c.categoryId
     WHERE ${andConditions}
     ORDER BY relevance DESC, p.productId DESC
     LIMIT ${safeLimit}`,
    [...scoreParams, ...andParams]
  );

  if (andRows.length > 0) return andRows;

  // Fallback: OR conditions nếu AND không ra kết quả nào
  const orConditions = keywords
    .map(() => `(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)`)
    .join(' OR ');
  const orParams = keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`, `%${kw}%`]);

  const [orRows] = await pool.execute(
    `SELECT p.*, c.name AS categoryName, (${scoreExpr}) AS relevance
     FROM Product p
     LEFT JOIN Category c ON p.categoryId = c.categoryId
     WHERE ${orConditions}
     ORDER BY relevance DESC, p.productId DESC
     LIMIT ${safeLimit}`,
    [...scoreParams, ...orParams]
  );

  return orRows;
}

function applyFilters(products, filters) {
  const { minPrice, maxPrice, categoryIds, minRating } = filters;
  
  console.log('🔍 Applying filters:', { minPrice, maxPrice, categoryIds, minRating });
  
  return products.filter(product => {
    // Price filter
    if (minPrice !== null || maxPrice !== null) {
      const prices = product.productPrices || [];
      if (prices.length === 0) return false;
      
      const productPrice = Math.min(...prices.map(p => Number(p.optionPrice || 0)));
      
      if (minPrice !== null && productPrice < minPrice) return false;
      if (maxPrice !== null && productPrice > maxPrice) return false;
    }
    
    // Category filter by ID (like Menu.jsx)
    if (categoryIds.length > 0) {
      const productCategoryId = Number(product.categoryId);
      const matches = categoryIds.includes(productCategoryId);
      if (!matches) {
        console.log(`❌ Category mismatch: product categoryId=${productCategoryId}, filter categoryIds=${categoryIds}`);
      }
      if (!matches) return false;
    }
    
    // Rating filter
    if (minRating !== null) {
      const rating = Number(product.rating || 0);
      if (rating < minRating) return false;
    }
    
    return true;
  });
}

exports.semanticSearch = async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json({ results: [], total: 0, page: 1, totalPages: 0 });

    // ✅ Spell correction — only for display suggestion, never replaces the actual search
    const correction = correctQuery(q);

    // Pagination params
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // ✅ Filter params
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const categoryIds = req.query.categoryIds ? req.query.categoryIds.split(',').map(id => parseInt(id)).filter(Boolean) : [];
    const minRating = req.query.minRating ? parseFloat(req.query.minRating) : null;

    const pool = getPool();

    // Luôn tìm kiếm bằng query GỐC của người dùng, chỉ dùng corrected để gợi ý hiển thị
    const searchQuery = q;

    // ✅ Dùng GraphRAG từ AI Service (lấy nhiều hơn để paginate)
    let aiProducts = [];
    try {
      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/search`,
        { query: searchQuery, top_k: 200 },
        { timeout: 10000 }
      );
      aiProducts = aiResponse.data?.results || [];
    } catch (aiErr) {
      // Nếu AI service chưa chạy / thiếu OPENAI_API_KEY => fallback SQL để search vẫn hoạt động
      console.warn("semanticSearch: AI service unavailable, fallback SQL search", {
        message: aiErr.message,
        code: aiErr.code,
      });
      const fallbackRows = await fallbackSqlSearch(pool, searchQuery, 200);
      let enriched = await attachProductPrices(pool, fallbackRows);
      
      // ✅ Apply filters
      enriched = applyFilters(enriched, { minPrice, maxPrice, categoryIds, minRating });
      
      const total = enriched.length;
      const paginated = enriched.slice(offset, offset + limit);
      return res.json({
        results: paginated,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
        spellCorrection: correction.hasCorrected ? {
          original: correction.original,
          suggested: correction.corrected
        } : null
      });
    }

    if (aiProducts.length === 0) {
      const fallbackRows = await fallbackSqlSearch(pool, searchQuery, 200);
      let enriched = await attachProductPrices(pool, fallbackRows);
      
      // ✅ Apply filters
      enriched = applyFilters(enriched, { minPrice, maxPrice, categoryIds, minRating });
      
      const total = enriched.length;
      const paginated = enriched.slice(offset, offset + limit);
      return res.json({
        results: paginated,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
        spellCorrection: correction.hasCorrected ? {
          original: correction.original,
          suggested: correction.corrected
        } : null
      });
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
      const fallbackRows = await fallbackSqlSearch(pool, q, 100);
      let enrichedFallback = await attachProductPrices(pool, fallbackRows);
      
      // ✅ Apply filters
      enrichedFallback = applyFilters(enrichedFallback, { minPrice, maxPrice, categoryIds, minRating });
      
      const total = enrichedFallback.length;
      const paginatedFallback = enrichedFallback.slice(offset, offset + limit);
      return res.json({
        results: paginatedFallback,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
        spellCorrection: correction.hasCorrected ? {
          original: correction.original,
          suggested: correction.corrected
        } : null
      });
    }

    // ✅ Apply filters to AI results
    let filteredResults = applyFilters(enrichedOrdered, { minPrice, maxPrice, categoryIds, minRating });
    
    // Paginate filtered results
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit);

    return res.json({
      results: paginatedResults,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + limit < total,
      spellCorrection: correction.hasCorrected ? {
        original: correction.original,
        suggested: correction.corrected
      } : null
    });
  } catch (err) {
    console.error("semanticSearch error:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};