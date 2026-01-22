const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Cấu hình multer để xử lý file upload (chỉ lưu vào memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh!'), false);
    }
  },
});

class UploadController {
  // Upload ảnh lên Cloudinary
  static async uploadImage(req, res) {
    try {
      // Kiểm tra Cloudinary config
      if (!process.env.CLOUDINARY_CLOUD_NAME || 
          !process.env.CLOUDINARY_API_KEY || 
          !process.env.CLOUDINARY_API_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'Cloudinary chưa được cấu hình. Vui lòng thêm biến môi trường vào file .env'
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Không có file được upload' 
        });
      }

      // Upload lên Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'ecommerce/products', // Folder trên Cloudinary
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      res.json({
        success: true,
        imageUrl: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi upload ảnh',
      });
    }
  }

  // Xóa ảnh khỏi Cloudinary
  static async deleteImage(req, res) {
    try {
      const { publicId } = req.body;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu publicId',
        });
      }

      // Xóa ảnh từ Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);

      res.json({
        success: true,
        result,
        message: 'Xóa ảnh thành công',
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xóa ảnh',
      });
    }
  }
}

// Export middleware và controller
module.exports = {
  upload: upload.single('image'),
  UploadController,
};

