const fs = require('fs');
const path = require('path');
const lineReader = require('line-reader');

const modelPath = path.join(__dirname, '../config/2vec.txt');

let wordVectors = {};
let vectorSize = 0;
let loaded = false;

// ⭐ Load mô hình 2vec.txt
async function loadWord2Vec() {
  if (loaded) return;

  return new Promise((resolve, reject) => {
    console.log("🔄 Đang load 2vec...");

    lineReader.eachLine(modelPath, (line, last) => {
      const parts = line.trim().split(/\s+/);
      const word = parts.shift();
      const vector = parts.map(Number);

      if (!vectorSize) vectorSize = vector.length;

      wordVectors[word.toLowerCase()] = vector;

      if (last) {
        loaded = true;
        console.log(`✅ Loaded ${Object.keys(wordVectors).length} vectors (${vectorSize} dims)`);
        resolve();
      }
    });
  });
}

// ⭐ Tạo embedding cho từ khoá truy vấn
function getSentenceVector(text = "") {
  if (!loaded) return [];

  const words = text.toLowerCase().split(/\s+/);
  const vec = Array(vectorSize).fill(0);
  let count = 0;

  for (const w of words) {
    if (wordVectors[w]) {
      const v = wordVectors[w];
      for (let i = 0; i < vectorSize; i++) {
        vec[i] += v[i];
      }
      count++;
    }
  }

  if (count === 0) return Array(vectorSize).fill(0);

  return vec.map(v => v / count);
}

module.exports = {
  loadWord2Vec,
  getSentenceVector
};
