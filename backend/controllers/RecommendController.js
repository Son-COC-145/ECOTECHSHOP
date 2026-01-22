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
        message: "Invalid user ID" 
      });
    }

    const recs = await getRecommendations(userId);
    res.json({ success: true, recommendations: recs });
  } catch (err) {
    console.error("Recommend ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: "Error generating recommendations", 
      error: err.message 
    });
  }
};

// ⭐ NCF mới
exports.getNcfRecommendations = async (req, res) => {
  const timeout = 30000; // 30 seconds timeout
  let timeoutId;

  try {
    const userId = Number(req.params.userId);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid user ID" 
      });
    }

    // Tạo promise với timeout
    const recommendationPromise = (async () => {
      // Lấy tất cả product
      const products = await ProductDAO.getAll();
      
      if (!products || products.length === 0) {
        return [];
      }

      const allProductIds = products.map(p => p.productId);
      const recs = await recommendForUser(userId, allProductIds, 10);
      return recs;
    })();

    // Tạo timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Request timeout: NCF recommendation took too long"));
      }, timeout);
    });

    // Race giữa recommendation và timeout
    const recs = await Promise.race([recommendationPromise, timeoutPromise]);
    
    // Clear timeout nếu thành công
    clearTimeout(timeoutId);

    res.json({ success: true, recommendations: recs });
  } catch (err) {
    // Clear timeout nếu có lỗi
    if (timeoutId) clearTimeout(timeoutId);

    console.error("NCF ERROR:", err);
    
    // Phân biệt các loại lỗi
    if (err.message.includes("timeout")) {
      return res.status(504).json({ 
        success: false,
        message: "Request timeout. Please try again later.",
        error: err.message 
      });
    }

    if (err.message.includes("not found")) {
      return res.status(404).json({ 
        success: false,
        message: "NCF model files not found. Please check server configuration.",
        error: err.message 
      });
    }

    res.status(500).json({ 
      success: false,
      message: "NCF error", 
      error: err.message 
    });
  }
};