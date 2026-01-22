const { getPool } = require("../config/db");

// ⭐ Convert mảng float → Buffer Float32Array
function floatArrayToBuffer(arr) {
  return Buffer.from(Float32Array.from(arr).buffer);
}

// ⭐ Convert Buffer → mảng float
function bufferToFloatArray(buffer) {
  return Array.from(
    new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)
  );
}

async function saveProductEmbedding(productId, vector) {
  const pool = getPool();
  const embedding = floatArrayToBuffer(vector);

  await pool.execute(
    `
    INSERT INTO ProductEmbedding (productId, embedding, vectorDim, updatedAt)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      embedding = VALUES(embedding),
      vectorDim = VALUES(vectorDim),
      updatedAt = NOW()
    `,
    [productId, embedding, vector.length]
  );
}

async function getProductEmbedding(productId) {
  const pool = getPool();
  const [rows] = await pool.execute(
    `
    SELECT embedding, vectorDim
    FROM ProductEmbedding
    WHERE productId = ?
    LIMIT 1
    `,
    [productId]
  );

  if (!rows.length) return null;
  return bufferToFloatArray(rows[0].embedding);
}

async function getAllEmbeddings() {
  const pool = getPool();
  const [rows] = await pool.execute(`
    SELECT productId, embedding, vectorDim
    FROM ProductEmbedding
  `);

  return rows.map((row) => ({
    productId: row.productId,
    embedding: bufferToFloatArray(row.embedding),
  }));
}

module.exports = {
  saveProductEmbedding,
  getProductEmbedding,
  getAllEmbeddings,
};