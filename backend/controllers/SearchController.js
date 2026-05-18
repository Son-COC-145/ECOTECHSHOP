const axios = require("axios");
const { getPool } = require("../config/db");
const { correctQuery } = require("../utils/spellCorrection");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
const SEARCH_DEBUG = process.env.SEARCH_DEBUG === "true";

const SYNONYM_GROUPS = [
  ["dien thoai", "smartphone", "smart phone", "phone", "mobile"],
  ["dong ho", "smartwatch", "smart watch", "watch"],
  ["tai nghe", "earphone", "earbud", "headphone"],
  ["may tinh", "laptop", "notebook"],
  ["may tinh bang", "tablet", "ipad"],
];

const BRAND_KEYWORDS = [
  "iphone",
  "samsung",
  "xiaomi",
  "oppo",
  "vivo",
  "realme",
  "huawei",
  "nokia",
  "apple",
  "asus",
  "dell",
  "hp",
  "lenovo",
  "acer",
  "msi",
  "sony",
  "lg",
  "oneplus",
];

function normalizeText(text) {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getKeywordTokens(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter((token) => token.length >= 2);
}

function tokenizeText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

function expandSynonyms(tokens, phrase) {
  const expanded = new Set(tokens);
  const normalizedPhrase = normalizeText(phrase);

  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map((item) => normalizeText(item));
    const phraseMatch = normalizedGroup.includes(normalizedPhrase);
    const tokenMatch = normalizedGroup.some((item) => tokens.includes(item));
    if (!phraseMatch && !tokenMatch) continue;

    for (const item of normalizedGroup) {
      item
        .split(/\s+/)
        .filter((token) => token.length >= 2)
        .forEach((token) => expanded.add(token));
    }
  }

  return Array.from(expanded);
}

function buildQueryContext(query) {
  const phrase = normalizeText(query);
  const tokens = getKeywordTokens(query);
  const expandedTokens = expandSynonyms(tokens, phrase);

  return {
    phrase,
    tokens,
    expandedTokens,
    tokensSet: new Set(tokens),
    expandedTokensSet: new Set(expandedTokens),
  };
}

function scoreKeywordMatch(product, queryContext) {
  const { phrase, expandedTokens } = queryContext;
  const name = normalizeText(product?.name || "");
  const category = normalizeText(product?.categoryName || "");
  const brand = normalizeText(product?.brandName || "");
  const description = normalizeText(product?.description || "");

  const primaryHaystack = `${name} ${category} ${brand}`.trim();
  const isMultiWord = phrase && phrase.includes(" ");
  const primaryTokens = new Set(tokenizeText(primaryHaystack));
  const descriptionTokens = new Set(tokenizeText(description));

  let score = 0;
  if (phrase && name.includes(phrase)) score += 10;
  if (phrase && category.includes(phrase)) score += 9;
  if (phrase && brand.includes(phrase)) score += 7;
  if (phrase && primaryHaystack.includes(phrase)) score += 6;

  const allInPrimary =
    expandedTokens.length > 0 && expandedTokens.every((t) => primaryTokens.has(t));
  if (allInPrimary) score += 6;

  const allInDescription =
    expandedTokens.length > 0 && expandedTokens.every((t) => descriptionTokens.has(t));
  if (allInDescription) score += 3;

  for (const token of expandedTokens) {
    if (primaryTokens.has(token)) {
      score += 1;
    } else if (descriptionTokens.has(token)) {
      score += 0.5;
    }
  }

  const isStrong = isMultiWord
    ? name.includes(phrase) || category.includes(phrase) || allInPrimary
    : score >= 6;

  return {
    score,
    isStrong,
  };
}

function applyKeywordFilter(products, query, options = {}) {
  const queryContext = typeof query === "string" ? buildQueryContext(query) : query;
  const { expandedTokens } = queryContext;
  if (expandedTokens.length === 0) return products;

  const { allowFallbackToOriginal = true, requireStrong = false } = options;

  const scored = products
    .map((product) => {
      const { score, isStrong } = scoreKeywordMatch(product, queryContext);
      return {
        ...product,
        keywordScore: score,
        similarity: product?.similarity ?? score,
        _keywordStrong: isStrong,
      };
    })
    .filter((product) => product.keywordScore > 0);

  if (scored.length === 0) return allowFallbackToOriginal ? products : [];

  const strongMatches = scored.filter((product) => product._keywordStrong);
  const filtered = strongMatches.length > 0 ? strongMatches : scored;

  if (requireStrong && strongMatches.length === 0) {
    return [];
  }

  return filtered
    .map(({ _keywordStrong, ...rest }) => rest)
    .sort((a, b) => (b.keywordScore || 0) - (a.keywordScore || 0));
}

function applyCategoryBrandConstraints(products, constraints) {
  let result = products;

  if (constraints.categoryIds.length > 0) {
    const allowed = new Set(constraints.categoryIds);
    result = result.filter((product) => allowed.has(Number(product.categoryId)));
  }

  if (constraints.brandTokens.length > 0) {
    const brandSet = new Set(constraints.brandTokens);
    result = result.filter((product) => {
      const brandTokens = tokenizeText(product?.brandName || "");
      const nameTokens = tokenizeText(product?.name || "");
      return brandTokens.some((token) => brandSet.has(token)) ||
        nameTokens.some((token) => brandSet.has(token));
    });
  }

  return result;
}

function mergeCategoryFilters(uiCategoryIds, queryCategoryIds) {
  if (queryCategoryIds.length === 0) return uiCategoryIds;
  if (uiCategoryIds.length === 0) return queryCategoryIds;
  return uiCategoryIds.filter((id) => queryCategoryIds.includes(id));
}

function logSearchDebug(stage, payload) {
  if (!SEARCH_DEBUG) return;
  console.log(`[search] ${stage}`, payload);
}

function logResultSample(stage, products, constraints) {
  if (!SEARCH_DEBUG) return;
  const brandSet = new Set(constraints.brandTokens || []);
  const sample = products.slice(0, 5).map((product) => {
    const nameTokens = tokenizeText(product?.name || "");
    const brandTokens = tokenizeText(product?.brandName || "");
    const brandMatch =
      brandSet.size > 0
        ? nameTokens.some((token) => brandSet.has(token)) ||
          brandTokens.some((token) => brandSet.has(token))
        : null;

    return {
      productId: product.productId,
      name: product.name,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      brandName: product.brandName,
      keywordScore: product.keywordScore,
      brandMatch,
    };
  });

  logSearchDebug(stage, {
    count: products.length,
    sample,
  });
}

function buildCategoryMatchCandidates(queryContext) {
  const candidates = new Set([queryContext.phrase]);

  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map((item) => normalizeText(item));
    const groupMatch = normalizedGroup.some(
      (item) => item === queryContext.phrase
    );
    if (!groupMatch) continue;
    normalizedGroup.forEach((item) => candidates.add(item));
  }

  return Array.from(candidates).filter(Boolean);
}

async function getCategoryConstraint(pool, queryContext) {
  const [rows] = await pool.execute(
    "SELECT categoryId, name, parentId FROM Category"
  );

  const categoryRows = Array.isArray(rows) ? rows : [];
  const categoryByParent = new Map();
  const normalizedCategories = categoryRows.map((row) => {
    const normalizedName = normalizeText(row.name || "");
    const tokens = normalizedName.split(/\s+/).filter(Boolean);
    if (!categoryByParent.has(row.parentId)) categoryByParent.set(row.parentId, []);
    categoryByParent.get(row.parentId).push(row.categoryId);
    return {
      ...row,
      normalizedName,
      tokens,
    };
  });

  const candidates = buildCategoryMatchCandidates(queryContext);
  const candidateSet = new Set(candidates);
  const matches = normalizedCategories.filter((category) => {
    if (candidateSet.has(category.normalizedName)) return true;
    if (category.tokens.length === 0) return false;
    return category.tokens.every((token) => queryContext.expandedTokensSet.has(token));
  });

  const matchedIds = new Set();
  const matchedNames = new Set();

  function collectDescendants(categoryId) {
    const children = categoryByParent.get(categoryId) || [];
    for (const childId of children) {
      if (matchedIds.has(childId)) continue;
      matchedIds.add(childId);
      collectDescendants(childId);
    }
  }

  for (const category of matches) {
    matchedIds.add(category.categoryId);
    matchedNames.add(category.normalizedName);
    collectDescendants(category.categoryId);
  }

  return {
    categoryIds: Array.from(matchedIds),
    categoryNames: Array.from(matchedNames),
  };
}

function getBrandConstraint(queryContext) {
  const brandTokens = BRAND_KEYWORDS.filter((brand) =>
    queryContext.expandedTokensSet.has(normalizeText(brand))
  );
  return brandTokens;
}

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

async function fetchProductsByCategoryIds(pool, categoryIds, limit = 200) {
  const ids = Array.isArray(categoryIds)
    ? categoryIds.map((id) => Number(id)).filter(Boolean)
    : [];
  if (ids.length === 0) return [];

  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.floor(Number(limit)))
    : 200;
  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await pool.execute(
    `
    SELECT p.*, c.name AS categoryName
    FROM Product p
    LEFT JOIN Category c ON p.categoryId = c.categoryId
    WHERE p.categoryId IN (${placeholders})
    ORDER BY p.productId DESC
    LIMIT ${safeLimit}
    `,
    ids
  );

  return rows || [];
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
    const queryContext = buildQueryContext(searchQuery);
    const categoryConstraint = await getCategoryConstraint(pool, queryContext);
    const brandTokens = getBrandConstraint(queryContext);
    const effectiveCategoryIds = mergeCategoryFilters(
      categoryIds,
      categoryConstraint.categoryIds
    );
    const hasCategoryMatch = categoryConstraint.categoryIds.length > 0;

    logSearchDebug("query", {
      query: searchQuery,
      tokens: queryContext.tokens,
      expandedTokens: queryContext.expandedTokens,
      categoryMatch: categoryConstraint.categoryNames,
      brandTokens,
    });

    if (hasCategoryMatch) {
      const categoryRows = await fetchProductsByCategoryIds(
        pool,
        categoryConstraint.categoryIds,
        200
      );
      let enriched = await attachProductPrices(pool, categoryRows);
      enriched = applyCategoryBrandConstraints(enriched, {
        categoryIds: categoryConstraint.categoryIds,
        brandTokens,
      });
      enriched = applyFilters(enriched, {
        minPrice,
        maxPrice,
        categoryIds: effectiveCategoryIds,
        minRating,
      });

      const total = enriched.length;
      const paginated = enriched.slice(offset, offset + limit);
      logResultSample("category-match-sample", paginated, {
        brandTokens,
      });
      return res.json({
        results: paginated,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
        spellCorrection: correction.hasCorrected ? {
          original: correction.original,
          suggested: correction.corrected,
        } : null,
      });
    }

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
      enriched = applyCategoryBrandConstraints(enriched, {
        categoryIds: categoryConstraint.categoryIds,
        brandTokens,
      });
      enriched = applyFilters(enriched, {
        minPrice,
        maxPrice,
        categoryIds: effectiveCategoryIds,
        minRating,
      });
      enriched = applyKeywordFilter(enriched, queryContext, {
        allowFallbackToOriginal: false,
        requireStrong: true,
      });
      
      const total = enriched.length;
      const paginated = enriched.slice(offset, offset + limit);
      logSearchDebug("fallback-sql", {
        totalBeforePaging: total,
      });
      logResultSample("fallback-sql-sample", paginated, {
        brandTokens,
      });
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
      enriched = applyCategoryBrandConstraints(enriched, {
        categoryIds: categoryConstraint.categoryIds,
        brandTokens,
      });
      enriched = applyFilters(enriched, {
        minPrice,
        maxPrice,
        categoryIds: effectiveCategoryIds,
        minRating,
      });
      enriched = applyKeywordFilter(enriched, queryContext, {
        allowFallbackToOriginal: false,
        requireStrong: true,
      });
      
      const total = enriched.length;
      const paginated = enriched.slice(offset, offset + limit);
      logResultSample("fallback-empty-ai-sample", paginated, {
        brandTokens,
      });
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
      enrichedFallback = applyCategoryBrandConstraints(enrichedFallback, {
        categoryIds: categoryConstraint.categoryIds,
        brandTokens,
      });
      enrichedFallback = applyFilters(enrichedFallback, {
        minPrice,
        maxPrice,
        categoryIds: effectiveCategoryIds,
        minRating,
      });
      enrichedFallback = applyKeywordFilter(enrichedFallback, queryContext, {
        allowFallbackToOriginal: false,
        requireStrong: true,
      });
      
      const total = enrichedFallback.length;
      const paginatedFallback = enrichedFallback.slice(offset, offset + limit);
      logResultSample("fallback-empty-ordered-sample", paginatedFallback, {
        brandTokens,
      });
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
    let filteredResults = applyCategoryBrandConstraints(enrichedOrdered, {
      categoryIds: categoryConstraint.categoryIds,
      brandTokens,
    });
    filteredResults = applyFilters(filteredResults, {
      minPrice,
      maxPrice,
      categoryIds: effectiveCategoryIds,
      minRating,
    });
    filteredResults = applyKeywordFilter(filteredResults, queryContext, {
      allowFallbackToOriginal: false,
      requireStrong: true,
    });

    if (filteredResults.length === 0) {
      const fallbackRows = await fallbackSqlSearch(pool, searchQuery, 200);
      let enrichedFallback = await attachProductPrices(pool, fallbackRows);
      enrichedFallback = applyCategoryBrandConstraints(enrichedFallback, {
        categoryIds: categoryConstraint.categoryIds,
        brandTokens,
      });
      enrichedFallback = applyFilters(enrichedFallback, {
        minPrice,
        maxPrice,
        categoryIds: effectiveCategoryIds,
        minRating,
      });
      enrichedFallback = applyKeywordFilter(enrichedFallback, queryContext, {
        allowFallbackToOriginal: false,
        requireStrong: true,
      });

      const total = enrichedFallback.length;
      const paginatedFallback = enrichedFallback.slice(offset, offset + limit);
      logResultSample("fallback-after-ai-filter-sample", paginatedFallback, {
        brandTokens,
      });
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
    
    // Paginate filtered results
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit);
    logResultSample("ai-results-sample", paginatedResults, {
      brandTokens,
    });

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