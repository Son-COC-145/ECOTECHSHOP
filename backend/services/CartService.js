// services/CartService.js
const CartDAO = require("../dao/CartDAO");
const ProductDAO = require("../dao/ProductDAO");

class CartService {
  // Lấy toàn bộ cart theo user
  async getCart(userId) {
    const rows = await CartDAO.getItems(userId);
    // CartDAO (mysql2) trả về array rows
    return Array.isArray(rows) ? rows : [];
  }

  // alias cho getCart (để CartController dùng)
  async getItems(userId) {
    return this.getCart(userId);
  }

  /**
   * Thêm sản phẩm (kèm biến thể) vào giỏ
   * data: { productId, productPriceId, productImageId, quantity, price }
   */
  async addToCart(
    userId,
    { productId, productPriceId, productImageId, quantity, price }
  ) {
    // mysql2 không cho bind parameter = undefined
    const normalizedProductPriceId = productPriceId ?? null;
    const normalizedProductImageId = productImageId ?? null;

    const product = await ProductDAO.getById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    const cartId = await CartDAO.getCartId(userId);
    const items = await this.getCart(userId);

    // Tìm item trùng product + biến thể
    const existing = items.find(
      (i) =>
        i.productId == productId &&
        i.productPriceId == normalizedProductPriceId &&
        i.productImageId == normalizedProductImageId
    );

    const qty = quantity && quantity > 0 ? quantity : 1;

    if (existing) {
      await CartDAO.updateQuantity(
        existing.cartItemId,
        existing.quantity + qty
      );
    } else {
      await CartDAO.addItem({
        cartId,
        productId,
        productPriceId: normalizedProductPriceId,
        productImageId: normalizedProductImageId,
        quantity: qty,
        price,
      });
    }

    return this.getCart(userId);
  }

  /**
   * Thay đổi số lượng bằng cartItemId
   */
  async changeQuantity(userId, cartItemId, change) {
    const items = await this.getCart(userId);
    const item = items.find((i) => i.cartItemId == cartItemId);

    if (!item) {
      console.warn(
        "[CartService] changeQuantity: cartItemId không tồn tại",
        { userId, cartItemId }
      );
      // Trả lại giỏ hiện tại cho êm, không quăng lỗi 500 nữa
      return items;
    }

    const newQty = item.quantity + change;

    if (newQty <= 0) {
      await CartDAO.removeItem(cartItemId);
    } else {
      await CartDAO.updateQuantity(cartItemId, newQty);
    }

    return this.getCart(userId);
  }

  async increaseQuantity(userId, cartItemId) {
    return this.changeQuantity(userId, cartItemId, +1);
  }

  async decreaseQuantity(userId, cartItemId) {
    return this.changeQuantity(userId, cartItemId, -1);
  }

  async removeFromCart(userId, cartItemId) {
    await CartDAO.removeItem(cartItemId);
    return this.getCart(userId);
  }

  /**
   * Xoá sạch giỏ của user
   */
  async clearCart(userId) {
    await CartDAO.clearCart(userId);
    return [];
  }

  /**
   * Xóa nhiều items khỏi giỏ hàng
   * items: [
   *   { productId, productPriceId, productImageId, ... }
   * ]
   */
  async removeItems(userId, items) {
    if (!items || items.length === 0) {
      return this.getCart(userId);
    }

    await CartDAO.removeItems(userId, items);
    return this.getCart(userId);
  }
}

module.exports = new CartService();