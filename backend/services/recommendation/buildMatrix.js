function buildUserProductMatrix(ratings, numUsers, numProducts) {
    const matrix = Array.from({ length: numUsers }, () =>
        Array(numProducts).fill(0)
    );

    ratings.forEach(r => {
        if (r.userId >= numUsers) {
            console.error("User ID exceeds matrix size:", r);
            return;
        }
        if (r.productId >= numProducts) {
            console.error("Product ID exceeds matrix size:", r);
            return;
        }

        matrix[r.userId][r.productId] = r.rating;
    });

    return matrix;
}

module.exports = { buildUserProductMatrix };
