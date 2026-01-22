const PriceService = require('../services/PriceService');

class PriceController {

  // GET /api/prices?productId=xx
  static async getPrices(req, res) {
    try {
      const { productId } = req.query;
      const prices = await PriceService.getPrices(productId);

      res.json({
        success: true,
        data: prices  // chuẩn REST: data
      });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET /api/prices/:id
  static async getPriceById(req, res) {
    try {
      const price = await PriceService.getPriceById(req.params.id);

      if (!price)
        return res.status(404).json({ success: false, message: "Không tìm thấy!" });

      res.json({ success: true, data: price });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/prices
  static async addPrice(req, res) {
    try {
      console.log("PriceController.addPrice - Request body:", req.body);
      
      const { productId, optionName, optionPrice } = req.body;
      
      // Validation
      if (!productId) {
        console.error("PriceController.addPrice - Missing productId");
        return res.status(400).json({ 
          success: false, 
          message: 'Thiếu productId' 
        });
      }
      
      if (!optionName || !optionName.trim()) {
        console.error("PriceController.addPrice - Missing optionName");
        return res.status(400).json({ 
          success: false, 
          message: 'Thiếu optionName' 
        });
      }
      
      if (optionPrice === undefined || optionPrice === null || optionPrice === '') {
        console.error("PriceController.addPrice - Missing optionPrice");
        return res.status(400).json({ 
          success: false, 
          message: 'Thiếu optionPrice' 
        });
      }
      
      console.log("PriceController.addPrice - Calling PriceService.createPrice with:", {
        productId,
        optionName: optionName.trim(),
        optionPrice: Number(optionPrice)
      });
      
      await PriceService.createPrice({
        productId: Number(productId),
        optionName: optionName.trim(),
        optionPrice: Number(optionPrice)
      });

      console.log("PriceController.addPrice - Price created successfully");

      res.status(201).json({
        success: true,
        message: 'Tạo thành công!'
      });

    } catch (err) {
      console.error("PriceController.addPrice - Error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Lỗi khi tạo giá' 
      });
    }
  }

  // PUT /api/prices/:id
  static async updatePrice(req, res) {
    try {
      await PriceService.updatePrice(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Cập nhật thành công!'
      });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // DELETE /api/prices/:id
  static async deletePrice(req, res) {
    try {
      await PriceService.deletePrice(req.params.id);

      res.json({
        success: true,
        message: 'Xoá thành công!'
      });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = PriceController;