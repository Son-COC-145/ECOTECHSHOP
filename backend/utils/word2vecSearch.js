const fs = require('fs');
const path = require('path');
const cosine = require('cosine-similarity');
const lineReader = require('line-reader');

const modelPath = path.join(__dirname, '../config/2vec.txt');
let wordVectors = {};
let vectorSize = 0;
let modelLoaded = false;

// Load word2vec model
async function loadWord2Vec() {
  if (modelLoaded) return;
  return new Promise((resolve, reject) => {
    console.log('🔄 Loading 2vec model...');
    let lineCount = 0;

    lineReader.eachLine(modelPath, (line, last) => {
      const parts = line.trim().split(/\s+/);
      const word = parts.shift();
      const vector = parts.map(Number);

      if (!vectorSize) vectorSize = vector.length;

      wordVectors[word] = vector;
      lineCount++;

      if (last) {
        modelLoaded = true;
        console.log(`✅ Loaded ${lineCount} word vectors (${vectorSize} dims)`);
        resolve();
      }
    });
  });
}

// Convert sentence to vector (mean pooling)
function getSentenceVector(text = '') {
  if (!vectorSize || Object.keys(wordVectors).length === 0) return [];

  const words = text.toLowerCase().split(/\s+/);
  const vec = Array(vectorSize).fill(0);
  let count = 0;

  for (const w of words) {
    if (wordVectors[w]) {
      const v = wordVectors[w];
      for (let i = 0; i < vectorSize; i++) vec[i] += v[i];
      count++;
    }
  }

  if (count === 0) return vec;
  return vec.map(v => v / count);
}

// Similarity
function findSimilarProducts(query, products = []) {
  const queryVec = getSentenceVector(query);

  const scored = products.map(p => ({
    ...p,
    similarity: cosine(queryVec, getSentenceVector(p.name || ''))
  }));

  return scored.sort((a, b) => b.similarity - a.similarity);
}

// ⭐ EXPORT ĐÚNG
module.exports = { loadWord2Vec, getSentenceVector, findSimilarProducts };
