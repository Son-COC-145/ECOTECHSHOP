import { getVector } from "./word2vecModel.js"; // nơi loadWord2Vec lưu vector

export function embedText(text) {
  const words = text.toLowerCase().split(/\s+/);
  const vectors = [];

  for (const w of words) {
    const v = getVector(w);
    if (v) vectors.push(v);
  }

  if (vectors.length === 0) return null;

  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      sum[i] += vec[i];
    }
  }

  return sum.map(x => x / vectors.length); // mean pooling
}
