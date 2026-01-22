const SummaryService = require('../services/SummaryService');

class SummaryController {
  static async addReviewAndUpdateSummary(req, res) {
    try {
      const { productId } = req.params;
      const { reviewText } = req.body;

      if (!reviewText || !reviewText.trim()) {
        return res.status(400).json({ error: "Review text is required" });
      }

      const result = await SummaryService.addReviewAndUpdate(
        productId,
        reviewText
      );

      res.json({ success: true, ...result });
    } catch (err) {
      console.error("Error updating summary:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getSummary(req, res) {
    try {
      const summary = await SummaryService.getSummary(req.params.productId);

      if (!summary) {
        return res.status(404).json({ error: "Summary not found" });
      }

      res.json({ success: true, summary });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = SummaryController;
