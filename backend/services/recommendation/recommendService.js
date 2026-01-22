const ReviewDAO = require("../../dao/ReviewDAO");
const { buildUserProductMatrix } = require("./buildMatrix");
const { calculateSimilarity } = require("./similarity");
const { recommendUserCF } = require("./userBasedCF");

async function getRecommendations(userId) {
    const ratings = await ReviewDAO.getAll();

    if (!ratings.length) {
        throw new Error("No ratings found in database");
    }

    // 👉 Tính số user và product chính xác từ DB
    const maxUserId = Math.max(...ratings.map(r => r.userId));
    const maxProductId = Math.max(...ratings.map(r => r.productId));

    const NUM_USERS = maxUserId + 1;
    const NUM_PRODUCTS = maxProductId + 1;

    console.log("NUM_USERS:", NUM_USERS);
    console.log("NUM_PRODUCTS:", NUM_PRODUCTS);

    const matrix = buildUserProductMatrix(
        ratings,
        NUM_USERS,
        NUM_PRODUCTS
    );

    if (!matrix[userId]) {
        throw new Error(`User ${userId} has no reviews or invalid userId.`);
    }

    const similarity = calculateSimilarity(matrix);

    return recommendUserCF(userId, matrix, similarity, 10);
}

module.exports = { getRecommendations };
