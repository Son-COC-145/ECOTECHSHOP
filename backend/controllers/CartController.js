// backend/controllers/CartController.js
const CartService = require("../services/CartService");

class CartController {
  async getCart(req, res) {
    try {
      const userId = req.user.id;
      const items = await CartService.getItems(userId);
      return res.json({ items });
    } catch (err) {
      console.error("❌ getCart error:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }

  async addToCart(req, res) {
    try {
      const userId = req.user.id;
      const productId = req.body?.productId;
      const productPriceId = req.body?.productPriceId ?? null;
      const productImageId = req.body?.productImageId ?? null;
      const quantity = req.body?.quantity;
      const price = req.body?.price;

      if (!productId) {
        return res.status(400).json({ message: "Thiếu productId" });
      }

      await CartService.addToCart(userId, {
        productId,
        productPriceId,
        productImageId,
        quantity,
        price,
      });

      const items = await CartService.getItems(userId);
      res.json({ items });
    } catch (err) {
      console.error("❌ addToCart error:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }

  async increaseQuantity(req, res) {
    try {
      const userId = req.user.id;
      const cartItemId = req.params.cartItemId || req.params.id;

      const items = await CartService.increaseQuantity(userId, cartItemId);
      res.json({ items });
    } catch (err) {
      console.error("❌ increaseQuantity error:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }

  async decreaseQuantity(req, res) {
    try {
      const userId = req.user.id;
      const cartItemId = req.params.cartItemId || req.params.id;

      const items = await CartService.decreaseQuantity(userId, cartItemId);
      res.json({ items });
    } catch (err) {
      console.error("❌ decreaseQuantity error:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }

  async removeFromCart(req, res) {
    try {
      const userId = req.user.id;
      const cartItemId = req.params.cartItemId || req.params.id;

      const items = await CartService.removeFromCart(userId, cartItemId);
      res.json({ items });
    } catch (err) {
      console.error("❌ removeFromCart error:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }

  async clearCart(req, res) {
    try {
      const userId = req.user.id;
      await CartService.clearCart(userId);
      return res.json({ items: [] });
    } catch (err) {
      console.error("❌ clearCart error:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }

  async removeItems(req, res) {
    try {
      const userId = req.user.id;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Thiếu danh sách items cần xóa" });
      }

      const remainingItems = await CartService.removeItems(userId, items);
      return res.json({ items: remainingItems });
    } catch (err) {
      console.error("❌ removeItems error:", err);
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }
}

module.exports = new CartController();