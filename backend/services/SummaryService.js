const stopwords = require('stopword');
const SummaryDAO = require('../dao/SummaryDAO');
const ProductSummary = require('../models/ProductSummary');

function preprocess(text) {
  return stopwords.removeStopwords(
    (text || '')
      .toLowerCase()
      .match(/\b[a-zA-Z]+\b/g) || []
  );
}

class SummaryService {
  static async addReviewAndUpdate(productId, reviewText) {
    const tokens = preprocess(reviewText);
    const delta = tokens.reduce((acc, w) => {
      acc[w] = (acc[w] || 0) + 1;
      return acc;
    }, {});

    let summary = await SummaryDAO.getByProduct(productId);

    if (!summary) {
      await SummaryDAO.create({
        productId,
        summary: reviewText,
        wordFreq: delta,
        totalReviews: 1
      });

      return { created: true };
    }

    const freq = { ...(summary.wordFreq || {}) };
    for (const [word, count] of Object.entries(delta)) {
      freq[word] = (freq[word] || 0) + count;
    }

    const filtered = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5000); // giữ tối đa 5000 từ

    await SummaryDAO.update(productId, {
      summary: `${summary.summary} ${reviewText}`.trim(),
      wordFreq: Object.fromEntries(filtered),
      totalReviews: summary.totalReviews + 1
    });

    return { updated: true };
  }

  static async getSummary(productId) {
    const row = await SummaryDAO.getByProduct(productId);
    return row ? new ProductSummary(row) : null;
  }
}

module.exports = SummaryService;
