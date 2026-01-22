// vnpayServer.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

dotenv.config(); // để lấy JWT_SECRET

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.",
});
app.use(limiter);

/* =========================
   VNPay CONFIG (HARDCODE)
========================= */

const VNPAY_PORT = Number(process.env.VNPAY_PORT || 5001);

// Merchant sandbox (ưu tiên lấy từ .env để không hardcode)
const vnp_TmnCode = process.env.VNPAY_TMN_CODE || "";
const vnp_HashSecret = process.env.VNPAY_HASH_SECRET || "";
const vnp_Url =
  process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

// Public URL để VNPay redirect về (thường là ngrok trỏ vào FRONTEND)
// - Nếu PUBLIC_BASE_URL không set (hoặc set = 'auto'), sẽ tự lấy từ ngrok local API: http://127.0.0.1:4040/api/tunnels
let _cachedPublicBaseUrl = null;
let _cachedPublicBaseUrlAt = 0;
const PUBLIC_BASE_URL_CACHE_MS = 60 * 1000;

async function resolvePublicBaseUrl() {
  const envUrl = String(process.env.PUBLIC_BASE_URL || "").trim();
  if (envUrl && envUrl.toLowerCase() !== "auto") return envUrl;

  const now = Date.now();
  if (_cachedPublicBaseUrl && now - _cachedPublicBaseUrlAt < PUBLIC_BASE_URL_CACHE_MS) {
    return _cachedPublicBaseUrl;
  }

  try {
    const resp = await axios.get("http://127.0.0.1:4040/api/tunnels", { timeout: 1500 });
    const tunnels = resp.data?.tunnels || [];
    const httpsTunnel = tunnels.find((t) => typeof t?.public_url === "string" && t.public_url.startsWith("https://"));
    const publicUrl = httpsTunnel?.public_url || tunnels[0]?.public_url || "";
    if (publicUrl) {
      _cachedPublicBaseUrl = publicUrl;
      _cachedPublicBaseUrlAt = now;
      return publicUrl;
    }
  } catch (e) {
    // ignore, fallback below
  }

  return "";
}

async function resolveVnpReturnUrl() {
  const baseUrl = await resolvePublicBaseUrl();
  return baseUrl ? `${baseUrl}/payment/return` : "";
}

// React frontend
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

if (!vnp_TmnCode || !vnp_HashSecret) {
  console.warn(
    "⚠️ VNPay merchant credentials chưa được cấu hình. Vui lòng set VNPAY_TMN_CODE và VNPAY_HASH_SECRET trong backend/.env"
  );
}

console.log("🔗 FRONTEND_URL:", frontendUrl);
console.log(
  "🔗 PUBLIC_BASE_URL:",
  process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL : "(auto via ngrok local API)"
);
console.log("🔗 TMN:", vnp_TmnCode ? "(configured)" : "(missing)");

/* =========================
   LƯU ĐƠN TẠM
========================= */

const tempOrders = {};
const processedOrders = new Set();

setInterval(() => {
  const now = Date.now();
  for (const orderId in tempOrders) {
    if (now - tempOrders[orderId].timestamp > 30 * 60 * 1000) {
      delete tempOrders[orderId];
    }
  }
}, 5 * 60 * 1000);

/* =========================
   HELPER
========================= */

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(/, /)[0] : req.ip;
  return ip === "::1" ? "127.0.0.1" : ip;
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.error("❌ Không có token trong header Authorization");
    return res
      .status(401)
      .json({ error: "Không có token, truy cập bị từ chối" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ Thiếu JWT_SECRET trong .env khi verify token");
    return res
      .status(500)
      .json({ error: "Thiếu JWT_SECRET trên VNPay server" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.id || decoded._id || decoded.userId;
    req.token = token;
    next();
  } catch (error) {
    console.error("❌ Lỗi verify JWT ở VNPay server:", error.message);
    return res.status(403).json({ error: "Token không hợp lệ" });
  }
};

// format yyyyMMddHHmmss theo GIỜ LOCAL (VN) – KHÔNG dùng toISOString
const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
const formatDateVN = (date) => {
  const yyyy = date.getFullYear();
  const MM = pad2(date.getMonth() + 1); // 0-11 -> 1-12
  const dd = pad2(date.getDate());
  const HH = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
};

// sắp xếp theo key
const sortObject = (obj) => {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = obj[key];
    });
  return sorted;
};

// build chuỗi ký / query theo đúng chuẩn VNPay
const buildSignedQuery = (params) => {
  const sorted = sortObject(params);
  const signData = Object.keys(sorted)
    .map((key) => {
      const value =
        sorted[key] !== undefined && sorted[key] !== null
          ? String(sorted[key])
          : "";
      // encode + đổi %20 -> +
      return `${key}=${encodeURIComponent(value).replace(/%20/g, "+")}`;
    })
    .join("&");
  return { signData, sorted };
};

/* =========================
   TẠO THANH TOÁN VNPay
========================= */

app.post("/create_payment", authenticateToken, async (req, res) => {
  try {
    const { amount, orderInfo, items, address } = req.body;
    const userId = req.userId;
    const token = req.token;

    console.log("📦 /create_payment BODY:", JSON.stringify(req.body, null, 2));
    console.log("👤 userId decoded từ JWT:", userId);

    if (
      !userId ||
      !amount ||
      !orderInfo ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !address
    ) {
      console.error("❌ Thiếu dữ liệu tạo thanh toán");
      return res.status(400).json({
        error:
          "Thiếu thông tin cần thiết (userId, amount, orderInfo, items, address)",
      });
    }

    // Chuẩn hoá items
    const normalizedItems = [];
    for (const rawItem of items) {
      const unitPrice =
        typeof rawItem.unitPrice === "number"
          ? rawItem.unitPrice
          : typeof rawItem.price === "number"
          ? rawItem.price
          : null;

      if (
        !rawItem.productId ||
        !rawItem.quantity ||
        !unitPrice ||
        unitPrice <= 0
      ) {
        console.error("❌ Item không hợp lệ:", rawItem);
        return res.status(400).json({
          error:
            "Dữ liệu sản phẩm không hợp lệ (productId, quantity, unitPrice/price)",
        });
      }

      normalizedItems.push({
        productId: rawItem.productId,
        productPriceId: rawItem.productPriceId ?? null,
        productImageId: rawItem.productImageId ?? null,
        quantity: rawItem.quantity,
        unitPrice,
        optionName: rawItem.optionName || rawItem.size || null,
        color: rawItem.color || null,
        productName: rawItem.productName || rawItem.name || "",
        image: rawItem.image || null,
      });
    }

    const now = new Date(); // GIỜ LOCAL VN
    const createDate = formatDateVN(now); // yyyyMMddHHmmss
    const expire = new Date(now.getTime() + 15 * 60 * 1000); // +15 phút
    const expireDate = formatDateVN(expire);

    const orderId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const normalizedOrderInfo = orderInfo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .trim();

    const vnp_ReturnUrl = await resolveVnpReturnUrl();
    if (!vnp_ReturnUrl) {
      return res.status(500).json({
        error:
          "Không lấy được PUBLIC_BASE_URL. Hãy bật ngrok (ngrok http 3000) hoặc set PUBLIC_BASE_URL trong backend/.env",
      });
    }

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: vnp_TmnCode,
      vnp_Amount: String(parseInt(amount, 10) * 100),
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: normalizedOrderInfo,
      vnp_OrderType: "250000",
      vnp_Locale: "vn",
      vnp_ReturnUrl: vnp_ReturnUrl,
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const { signData } = buildSignedQuery(vnp_Params);
    const hmac = crypto.createHmac("sha512", vnp_HashSecret);
    const vnp_SecureHash = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    const query = `${signData}&vnp_SecureHash=${vnp_SecureHash}`;
    const paymentUrl = `${vnp_Url}?${query}`;

    tempOrders[orderId] = {
      userId,
      items: normalizedItems,
      address,
      amount: parseInt(amount, 10),
      token,
      timestamp: Date.now(),
    };

    console.log("🔐 CREATE signData:", signData);
    console.log("🔐 CREATE secureHash:", vnp_SecureHash);
    console.log("🔗 VNPay payment URL:", paymentUrl);

    res.json({ status: "success", url: paymentUrl });
  } catch (error) {
    console.error("❌ Lỗi trong /create_payment:", error);
    res.status(500).json({ error: "Lỗi server khi tạo URL thanh toán" });
  }
});

/* =========================
   XỬ LÝ RETURN TỪ VNPay
========================= */

app.get("/payment/return", async (req, res) => {
  try {
    console.log("↩️ RAW VNPay RETURN QUERY:", req.query);

    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params.vnp_SecureHash;

    if (
      !secureHash ||
      !vnp_Params.vnp_TxnRef ||
      !vnp_Params.vnp_Amount ||
      !vnp_Params.vnp_ResponseCode
    ) {
      console.error("❌ Thiếu tham số bắt buộc trong callback VNPay");
      return res.redirect(
        `${frontendUrl}/payment/failure?error=${encodeURIComponent(
          "Thiếu tham số từ VNPay"
        )}`
      );
    }

    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    const { signData } = buildSignedQuery(vnp_Params);
    const hmac = crypto.createHmac("sha512", vnp_HashSecret);
    const checkSum = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    console.log("🔁 RETURN signData:", signData);
    console.log("🔁 RETURN secureHash (VNPay gửi):", secureHash);
    console.log("🔁 RETURN checkSum  (mình tính):", checkSum);

    if (secureHash !== checkSum) {
      console.error("❌ Chữ ký VNPay không khớp!");
      return res.redirect(
        `${frontendUrl}/payment/failure?error=${encodeURIComponent(
          "Chữ ký không hợp lệ"
        )}`
      );
    }

    const rspCode = vnp_Params.vnp_ResponseCode;
    const txnRef = vnp_Params.vnp_TxnRef;
    const transactionNo = vnp_Params.vnp_TransactionNo || "N/A";

    if (!tempOrders[txnRef]) {
      console.error("❌ Không tìm thấy đơn tạm với txnRef:", txnRef);
      return res.redirect(
        `${frontendUrl}/payment/failure?error=${encodeURIComponent(
          "Không tìm thấy thông tin đơn hàng tạm thời"
        )}`
      );
    }

    if (processedOrders.has(txnRef)) {
      console.log(`ℹ️ Đơn hàng ${txnRef} đã được xử lý trước đó.`);
      // 🔁 Ở đây cũng trả về responseCode để FE hiểu là success
      return res.redirect(
        `${frontendUrl}/payment/success?txnRef=${txnRef}&transactionNo=${transactionNo}&responseCode=${rspCode}&vnp_ResponseCode=${rspCode}`
      );
    }

    const { userId, items, address, amount, token } = tempOrders[txnRef];

    const vnpAmount = parseInt(vnp_Params.vnp_Amount, 10) / 100;
    if (vnpAmount !== amount) {
      console.error(
        `❌ Số tiền không khớp. VNPay: ${vnpAmount}, local: ${amount}`
      );
      return res.redirect(
        `${frontendUrl}/payment/failure?error=${encodeURIComponent(
          "Số tiền không khớp"
        )}`
      );
    }

    if (rspCode === "00") {
      // Chuẩn hóa địa chỉ: ưu tiên gửi đầy đủ province, district, ward, detail
      // Nếu không có, giữ nguyên format cũ
      const normalizedAddress = {
        fullName: address.fullName,
        phone: address.phone,
        // Nếu có đầy đủ thông tin, gửi từng trường
        ...(address.province && address.district && address.ward && address.detail
          ? {
              province: address.province,
              district: address.district,
              ward: address.ward,
              detail: address.detail,
            }
          : {
              // Nếu không có, gửi chuỗi address (cho tương thích ngược)
              address:
                address.address ||
                (address.detail && address.ward && address.district && address.province
                  ? `${address.detail}, ${address.ward}, ${address.district}, ${address.province}`
                  : ""),
            }),
      };

      const orderData = {
        userId,
        items: items.map((item) => ({
          productId: item.productId,
          productPriceId: item.productPriceId ?? null,
          productImageId: item.productImageId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          optionName: item.optionName || null,
          color: item.color || null,
        })),
        totalPrice: amount,
        transactionId: transactionNo,
        address: normalizedAddress,
      };

      console.log("🧾 ORDER DATA gửi về backend 5000:", orderData);

      try {
        const orderResponse = await axios.post(
          "http://localhost:5000/api/orders",
          orderData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("✅ Đơn hàng tạo thành công:", orderResponse.data);

        try {
          const cartResponse = await axios.post(
            "http://localhost:5000/api/carts/remove-items",
            { items: orderData.items },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("🧹 Đã xóa sản phẩm khỏi giỏ:", cartResponse.data);
        } catch (cartErr) {
          console.error(
            "⚠️ Lỗi khi xóa sản phẩm khỏi giỏ:",
            cartErr.response?.data || cartErr.message
          );
        }
      } catch (error) {
        console.error(
          "❌ Lỗi khi tạo đơn hàng ở backend 5000:",
          error.response?.data || error.message
        );
      }

      processedOrders.add(txnRef);
      delete tempOrders[txnRef];

      // 🔑 ĐIỂM CHÍNH: trả về responseCode=00 để PaymentSuccess.jsx nhận
      return res.redirect(
        `${frontendUrl}/payment/success?txnRef=${txnRef}&transactionNo=${transactionNo}&responseCode=${rspCode}&vnp_ResponseCode=${rspCode}`
      );
    } else {
      console.warn(`⚠️ VNPay trả về mã lỗi rspCode=${rspCode}`);
      delete tempOrders[txnRef];
      return res.redirect(
        `${frontendUrl}/payment/failure?txnRef=${txnRef}&responseCode=${rspCode}`
      );
    }
  } catch (error) {
    console.error("❌ Lỗi trong /payment/return:", error);
    return res.redirect(
      `${frontendUrl}/payment/failure?error=${encodeURIComponent(
        error.message || "Lỗi server khi xử lý phản hồi từ VNPay"
      )}`
    );
  }
});

/* =========================
   START SERVER (5001)
========================= */

app.listen(VNPAY_PORT, () =>
  console.log(`🚀 VNPay Server running on port ${VNPAY_PORT}`)
);