const express = require("express");
const router = express.Router();

const recommendController = require("../controllers/RecommendController");

// User–User CF
router.get("/user/:userId", recommendController.getUserRecommendations);

// ⭐ NCF
router.get("/ncf/:userId", recommendController.getNcfRecommendations);

module.exports = router;
