const express = require("express");
const router = express.Router();
const { getRelatedProducts } = require("../services/RelatedProductService");

router.get("/:id", async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const result = await getRelatedProducts(productId, 6);
    res.json(result);
  } catch (err) {
    console.error("❌ Related products error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
