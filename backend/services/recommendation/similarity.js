const cosine = require("compute-cosine-similarity");

function calculateSimilarity(matrix) {
  const users = matrix.length;

  const similarity = Array.from({ length: users }, () =>
    Array(users).fill(0)
  );

  for (let i = 0; i < users; i++) {
    for (let j = 0; j < users; j++) {
      if (i !== j) {
        const score = cosine(matrix[i], matrix[j]);
        similarity[i][j] = score || 0; // tránh NaN
      }
    }
  }

  return similarity;
}

module.exports = { calculateSimilarity };
