const { getRecommendations } = require("../services/recommendation/recommendService");
const { recommendForUser } = require("../services/recommendation/ncfService");
const ProductDAO = require("../dao/ProductDAO");

// CF cũ
exports.getUserRecommendations = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const recs = await getRecommendations(userId);
    res.json({ success: true, recommendations: recs });
  } catch (err) {
    console.error("Recommend ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Error generating recommendations",
      error: err.message,
    });
  }
};

// NCF mới + fallback CF
exports.getNcfRecommendations = async (req, res) => {
  const timeout = 30000;
  let timeoutId;

  try {
    const userId = Number(req.params.userId);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const recommendationPromise = (async () => {
      const products = await ProductDAO.getAll();

      if (!products || products.length === 0) {
        return [];
      }

      const allProductIds = products.map((p) => p.productId);
      return await recommendForUser(userId, allProductIds, 10);
    })();

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Request timeout: NCF recommendation took too long"));
      }, timeout);
    });

    const recs = await Promise.race([recommendationPromise, timeoutPromise]);

    if (timeoutId) clearTimeout(timeoutId);

    return res.json({
      success: true,
      source: "ncf",
      recommendations: recs,
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);

    console.error("NCF ERROR:", err.message);

    // Fallback khi thiếu model NCF trên Render
    try {
      const userId = Number(req.params.userId);
      const fallbackRecs = await getRecommendations(userId);

      return res.json({
        success: true,
        source: "cf_fallback",
        message: "NCF unavailable, using CF fallback",
        recommendations: fallbackRecs || [],
      });
    } catch (fallbackErr) {
      console.error("CF FALLBACK ERROR:", fallbackErr);

      return res.status(500).json({
        success: false,
        message: "Recommendation error",
        error: fallbackErr.message,
      });
    }
  }
};