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

dotenv.config();

const app = express();

/* =========================
   CACHE & CONSTANTS
========================= */
const VNPAY_PORT = Number(process.env.VNPAY_PORT || 5001);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_API_URL = process.env.API_BASE_URL || "http://localhost:5000";

// Ngrok Auto-Detect Cache
let _cachedPublicBaseUrl = null;
let _cachedPublicBaseUrlAt = 0;
const PUBLIC_BASE_URL_CACHE_MS = 60 * 1000;

/* =========================
   MIDDLEWARE
========================= */
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

/* =========================
   IN-MEMORY STORAGE (OPTIMIZED)
========================= */
const tempOrders = new Map();     // Pending orders
const processedOrders = new Map(); // Processed transaction ids

// Cleanup Job: runs every 5 minutes
setInterval(() => {
  const now = Date.now();
  const EXPIRE_TIME = 30 * 60 * 1000; // 30 minutes

  for (const [key, value] of tempOrders.entries()) {
    if (now - value.timestamp > EXPIRE_TIME) {
      tempOrders.delete(key);
    }
  }

  for (const [key, timestamp] of processedOrders.entries()) {
    if (now - timestamp > EXPIRE_TIME) {
      processedOrders.delete(key);
    }
  }
}, 5 * 60 * 1000);

/* =========================
   HELPER FUNCTIONS
========================= */

// 1. Resolve External URL (Ngrok Support)
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
    const httpsTunnel = tunnels.find((t) => t.public_url?.startsWith("https://"));
    const publicUrl = httpsTunnel?.public_url || tunnels[0]?.public_url || "";

    if (publicUrl) {
      _cachedPublicBaseUrl = publicUrl;
      _cachedPublicBaseUrlAt = now;
      return publicUrl;
    }
  } catch (e) {
    // Ngrok auto-detect failed or not running.
  }
  return "";
}

async function resolveVnpReturnUrl() {
  const baseUrl = await resolvePublicBaseUrl();
  return baseUrl ? `${baseUrl}/payment/return` : "";
}

// 2. IP Detection
const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ipRaw = forwarded ? forwarded.split(/,/)[0].trim() : (req.ip || req.connection?.remoteAddress || "");
  if (!ipRaw) return "";
  if (ipRaw === "::1" || ipRaw === "::ffff:127.0.0.1") return "127.0.0.1";
  return ipRaw.replace("::ffff:", "");
};

// 3. Date Formatting (VN Time)
const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
const formatDateVN = (date) => {
  const yyyy = date.getFullYear();
  const MM = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const HH = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
};

// 4. Sort Object (Required by VNPay)
const sortObject = (obj) => {
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
};

// 5. Build query string & Signature
const buildSignedQuery = (params, secret) => {
  const sorted = sortObject(params);
  const signData = Object.keys(sorted)
    .map((key) => {
      const value = (sorted[key] !== null && sorted[key] !== undefined) ? String(sorted[key]) : "";
      return `${key}=${encodeURIComponent(value).replace(/%20/g, "+")}`;
    })
    .join("&");

  const hmac = crypto.createHmac("sha512", secret);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return { signData, secureHash };
};

// 6. Retry Handler for Internal API Calls
const postWithRetry = async (url, data, config, retries = 3) => {
  try {
    return await axios.post(url, data, config);
  } catch (error) {
    if (retries > 0) {
      console.warn(`f501 Retrying POST to ${url} (${retries} left)...`);
      await new Promise(res => setTimeout(res, 1000));
      return postWithRetry(url, data, config, retries - 1);
    }
    throw error;
  }
};

// 7. Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || decoded._id || decoded.userId;
    req.token = token;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid Token" });
  }
};

/* =========================
   ROUTES
========================= */

// 1. Create Payment
app.post("/create_payment", authenticateToken, async (req, res) => {
  try {
    const { amount, orderInfo, items, address, addressId } = req.body;
    const { userId, token } = req;

    if (!amount || !items?.length || (!address && !addressId)) {
      return res.status(400).json({ error: "Missing order data" });
    }

    const vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    const vnp_Url = process.env.VNPAY_URL;
    const vnp_ReturnUrl = await resolveVnpReturnUrl();

    if (!vnp_TmnCode || !vnp_HashSecret || !vnp_ReturnUrl) {
      return res.status(500).json({ error: "VNPay config missing (check .env or ngrok)" });
    }

    const orderId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const createDate = formatDateVN(now);
    const expireDate = formatDateVN(new Date(now.getTime() + 15 * 60 * 1000));

    const vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode,
      vnp_Amount: String(parseInt(amount, 10) * 100),
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo.trim(),
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl,
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const { signData, secureHash } = buildSignedQuery(vnp_Params, vnp_HashSecret);
    const paymentUrl = `${vnp_Url}?${signData}&vnp_SecureHash=${secureHash}`;

    const normalizedItems = items.map(item => ({
      productId: item.productId,
      productPriceId: item.productPriceId ?? null,
      productImageId: item.productImageId ?? null,
      quantity: item.quantity,
      unitPrice: item.unitPrice || item.price,
      optionName: item.optionName || item.size || null,
      color: item.color || null,
      productName: item.productName || item.name || null,
      image: item.image || null
    }));

    tempOrders.set(orderId, {
      userId,
      items: normalizedItems,
      address,
      addressId,
      amount: parseInt(amount, 10),
      token,
      timestamp: Date.now(),
    });

    console.log("Created Payment:", { orderId, amount, paymentUrl });
    res.json({ status: "success", url: paymentUrl });

  } catch (error) {
    console.error("Link Creation Error:", error.message);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

// 2. VNPay Return (Callback)
app.get("/payment/return", async (req, res) => {
  try {
    const rawQuery = req.originalUrl.split("?")[1] || "";
    const rawParams = {};
    rawQuery.split("&").forEach(pair => {
      const idx = pair.indexOf("=");
      if (idx > -1) {
        rawParams[pair.substring(0, idx)] = pair.substring(idx + 1);
      }
    });

    const secureHash = rawParams.vnp_SecureHash;
    const txnRef = rawParams.vnp_TxnRef;
    const rspCode = rawParams.vnp_ResponseCode;

    delete rawParams.vnp_SecureHash;
    delete rawParams.vnp_SecureHashType;

    const sorted = sortObject(rawParams);
    const signData = Object.keys(sorted).map(key => `${key}=${sorted[key]}`).join("&");
    const hmac = crypto.createHmac("sha512", process.env.VNPAY_HASH_SECRET);
    const checkSum = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (process.env.NODE_ENV === "development") {
      console.log("DEBUG signData:", (signData || "").substring(0, 200) + "...");
      console.log("DEBUG checkSum:", checkSum);
      console.log("DEBUG secureHash:", secureHash);
    }

    if (!secureHash) {
      console.error("Missing secure hash in callback for txn:", txnRef);
      return res.redirect(`${FRONTEND_URL}/payment/failure?error=MissingSignature`);
    }

    let requestHashBuffer, checkSumBuffer;
    try {
      requestHashBuffer = Buffer.from(String(secureHash), "hex");
      checkSumBuffer = Buffer.from(String(checkSum), "hex");
    } catch (e) {
      console.error("Invalid hash format:", e.message);
      return res.redirect(`${FRONTEND_URL}/payment/failure?error=InvalidSignatureFormat`);
    }

    if (requestHashBuffer.length !== checkSumBuffer.length ||
        !crypto.timingSafeEqual(requestHashBuffer, checkSumBuffer)) {
      console.error("Invalid Signature for txn:", txnRef);
      return res.redirect(`${FRONTEND_URL}/payment/failure?error=InvalidSignature`);
    }

    if (processedOrders.has(txnRef)) {
      console.log("Duplicate Callback for txn:", txnRef);
      return res.redirect(`${FRONTEND_URL}/payment/success?txnRef=${txnRef}&responseCode=${rspCode}`);
    }

    const orderDataTemp = tempOrders.get(txnRef);
    if (!orderDataTemp) {
      console.error("Order Not Found in Temp Store:", txnRef);
      return res.redirect(`${FRONTEND_URL}/payment/failure?error=OrderNotFound`);
    }

    if (rspCode === "00") {
      const { userId, items, address, addressId, amount, token } = orderDataTemp;

      const receivedAmount = Math.round(parseInt(rawParams.vnp_Amount || "0", 10) / 100);
      if (receivedAmount !== Number(amount)) {
        console.error("Amount Mismatch for txn:", txnRef, "received:", receivedAmount, "expected:", amount);
        return res.redirect(`${FRONTEND_URL}/payment/failure?error=AmountMismatch`);
      }

      let normalizedAddress = address;
      if (!addressId && address) {
        normalizedAddress = {
          fullName: address.fullName,
          phone: address.phone,
          ...(address.province && address.district && address.ward
            ? { province: address.province, district: address.district, ward: address.ward, detail: address.detail }
            : { address: address.address || `${address.detail}, ${address.ward}, ${address.district}, ${address.province}` })
        };
      } else if (addressId) {
        normalizedAddress = null;
      }

      try {
        const payload = {
          userId,
          items,
          totalPrice: amount,
          transactionId: decodeURIComponent(rawParams.vnp_TransactionNo || ""),
          address: normalizedAddress,
          addressId: addressId || undefined,
          paymentMethod: "VNPAY"
        };

        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log("Syncing Order to Backend:", txnRef);
        await postWithRetry(`${BACKEND_API_URL}/api/orders`, payload, config);

        console.log("Removing purchased items from cart...");
        try {
          await axios.post(
            `${BACKEND_API_URL}/api/cart/remove-items`,
            {
              items: items.map((item) => ({
                productId: item.productId,
                productPriceId: item.productPriceId ?? null,
                productImageId: item.productImageId ?? null,
              })),
            },
            config
          );
          console.log("Purchased items removed from cart");
        } catch (cartErr) {
          console.error("Cart cleanup failed:", cartErr.message);
        }

        processedOrders.set(txnRef, Date.now());
        tempOrders.delete(txnRef);

        console.log("Payment Processed Successfully:", txnRef);
        return res.redirect(`${FRONTEND_URL}/payment/success?txnRef=${txnRef}&transactionNo=${rawParams.vnp_TransactionNo}&responseCode=00`);

      } catch (err) {
        console.error("Order Creation Failed:", err.message);
        if (err.response) {
          console.error("Backend Error Details:", err.response.data);
        }
        return res.redirect(`${FRONTEND_URL}/payment/failure?error=OrderCreationFailed&txnRef=${txnRef}&transactionNo=${rawParams.vnp_TransactionNo}&responseCode=${rspCode}`);
      }
    } else {
      console.warn("Payment Failed with Code:", rspCode);
      tempOrders.delete(txnRef);
      return res.redirect(`${FRONTEND_URL}/payment/failure?responseCode=${rspCode}`);
    }

  } catch (error) {
    console.error("Callback Error:", error);
    res.redirect(`${FRONTEND_URL}/payment/failure?error=ServerCallbackError`);
  }
});

app.listen(VNPAY_PORT, () => {
  console.log(`VNPay Server running on port ${VNPAY_PORT}`);
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`Backend: ${BACKEND_API_URL}`);
});
