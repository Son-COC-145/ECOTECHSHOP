const cosine = require("cosine-similarity");
const { getProductEmbedding, getAllEmbeddings } = require("./ProductEmbeddingService");
const ProductDAO = require("../dao/ProductDAO");

async function getRelatedProducts(productId, topK = 6) {
  const target = await getProductEmbedding(productId);
  if (!target) return [];

  const all = await getAllEmbeddings();

  const scored = all
    .filter((x) => Number(x.productId) !== Number(productId))
    .map((x) => ({
      productId: x.productId,
      score: cosine(target, x.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Lấy thông tin product (đang có MySQL DAO)
  const products = await ProductDAO.getAll();
  const byId = new Map(products.map((p) => [p.productId, p]));

  return scored
    .map((s) => byId.get(s.productId))
    .filter(Boolean);
}

module.exports = { getRelatedProducts };