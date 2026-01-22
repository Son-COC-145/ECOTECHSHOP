const ort = require("onnxruntime-node");
const path = require("path");
const fs = require("fs");

let session = null;
let userMap = null;
let itemMap = null;
let isModelLoaded = false;

// ===========================
// LOAD MODEL + MAPPING
// ===========================
async function loadNCF() {
  const modelPath = path.join(__dirname, "../../ml/ncf.onnx");
  const userMapPath = path.join(__dirname, "../../ml/user_mapping.json");
  const itemMapPath = path.join(__dirname, "../../ml/item_mapping.json");

  // Kiểm tra file tồn tại
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found: ${modelPath}`);
  }
  if (!fs.existsSync(userMapPath)) {
    throw new Error(`User mapping file not found: ${userMapPath}`);
  }
  if (!fs.existsSync(itemMapPath)) {
    throw new Error(`Item mapping file not found: ${itemMapPath}`);
  }

  if (!session) {
    try {
      session = await ort.InferenceSession.create(modelPath);
      console.log("✅ NCF model loaded successfully");
    } catch (err) {
      throw new Error(`Failed to load NCF model: ${err.message}`);
    }
  }

  if (!userMap) {
    try {
      const rawUser = fs.readFileSync(userMapPath, "utf8");
      userMap = JSON.parse(rawUser);
      console.log(`✅ User mapping loaded: ${Object.keys(userMap).length} users`);
    } catch (err) {
      throw new Error(`Failed to load user mapping: ${err.message}`);
    }
  }

  if (!itemMap) {
    try {
      const rawItem = fs.readFileSync(itemMapPath, "utf8");
      itemMap = JSON.parse(rawItem);
      console.log(`✅ Item mapping loaded: ${Object.keys(itemMap).length} items`);
    } catch (err) {
      throw new Error(`Failed to load item mapping: ${err.message}`);
    }
  }

  isModelLoaded = true;
}

// ===========================
// PREDICT SCORE
// ===========================
async function predictScore(userId, productId) {
  if (!isModelLoaded) {
    await loadNCF();
  }

  // Convert sang string vì mapping file dùng key là string
  const uIdx = userMap[String(userId)];
  const pIdx = itemMap[String(productId)];

  if (uIdx === undefined) {
    console.warn(`⚠️ User ${userId} not found in user mapping`);
    return null;
  }
  
  if (pIdx === undefined) {
    // Không log warning cho product vì có thể có nhiều products không có trong mapping
    return null;
  }

  try {
    const userTensor = new ort.Tensor(
      "int64",
      BigInt64Array.from([BigInt(uIdx)]),
      [1]
    );

    const itemTensor = new ort.Tensor(
      "int64",
      BigInt64Array.from([BigInt(pIdx)]),
      [1]
    );

    const result = await session.run({
      user: userTensor,
      item: itemTensor,
    });

    return result.score.data[0];
  } catch (err) {
    console.error(`Error predicting score for user ${userId}, product ${productId}:`, err);
    return null;
  }
}

// ===========================
// TOP N RECOMMENDATIONS
// ===========================
async function recommendForUser(userId, allProductIds, topN = 10) {
  if (!isModelLoaded) {
    await loadNCF();
  }

  // Debug: Kiểm tra userMap
  const userIdStr = String(userId);
  console.log(`🔍 Looking up user ${userId} (as string: "${userIdStr}")`);
  console.log(`🔍 userMap type:`, typeof userMap);
  console.log(`🔍 userMap is null/undefined:`, userMap === null || userMap === undefined);
  if (userMap) {
    console.log(`🔍 userMap keys sample (first 5):`, Object.keys(userMap).slice(0, 5));
    console.log(`🔍 userMap["1"] =`, userMap["1"]);
    console.log(`🔍 userMap[userIdStr] =`, userMap[userIdStr]);
    console.log(`🔍 Total users in mapping:`, Object.keys(userMap).length);
  }

  // Kiểm tra userId có trong mapping không (convert sang string)
  // Sửa: dùng === undefined thay vì !value vì 0 là falsy value
  if (!userMap || userMap[userIdStr] === undefined) {
    console.warn(`⚠️ User ${userId} not found in user mapping. Returning empty recommendations.`);
    if (userMap) {
      console.warn(`⚠️ Available user IDs in mapping (first 10):`, Object.keys(userMap).slice(0, 10));
    }
    return [];
  }

  // Chỉ xử lý products có trong itemMap để tối ưu performance (convert sang string)
  const validProductIds = allProductIds.filter(pid => itemMap[String(pid)] !== undefined);
  
  if (validProductIds.length === 0) {
    console.warn("⚠️ No valid products found in item mapping");
    return [];
  }

  console.log(`🔄 Processing ${validProductIds.length} valid products for user ${userId}...`);

  const scores = [];

  // Xử lý song song theo batch để tăng tốc (mỗi batch 50 products)
  const batchSize = 50;
  const batches = [];
  
  for (let i = 0; i < validProductIds.length; i += batchSize) {
    batches.push(validProductIds.slice(i, i + batchSize));
  }

  // Xử lý từng batch song song
  for (const batch of batches) {
    const batchPromises = batch.map(async (pid) => {
      const score = await predictScore(userId, pid);
      if (score !== null) {
        return { productId: pid, score };
      }
      return null;
    });

    const batchResults = await Promise.all(batchPromises);
    const validScores = batchResults.filter(result => result !== null);
    scores.push(...validScores);
  }

  // Sắp xếp và lấy top N
  const sorted = scores.sort((a, b) => b.score - a.score);
  const topRecs = sorted.slice(0, topN);

  console.log(`✅ Generated ${topRecs.length} recommendations for user ${userId} from ${validProductIds.length} products`);
  
  return topRecs;
}

module.exports = {
  recommendForUser,
  predictScore,
};