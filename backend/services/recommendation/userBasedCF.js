function recommendUserCF(userId, matrix, similarity, topN = 5) {
  const ratedByUser = matrix[userId];

  const similarityScores = similarity[userId]
    .map((score, id) => ({ id, score }))
    .filter(x => x.id !== userId)
    .sort((a, b) => b.score - a.score);

  const bestUser = similarityScores[0].id;

  const ratedByBestUser = matrix[bestUser];
  const recommendations = [];

  for (let productId = 0; productId < ratedByBestUser.length; productId++) {
    if (ratedByUser[productId] === 0 && ratedByBestUser[productId] > 0) {
      recommendations.push({
        productId,
        score: ratedByBestUser[productId]
      });
    }
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

module.exports = { recommendUserCF };
