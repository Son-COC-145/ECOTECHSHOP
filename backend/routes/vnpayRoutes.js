const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const qs = require("qs");

/* =========================================
   SORT & ENCODE OBJECT
========================================= */
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  });

  return sorted;
}

/* =========================================
   CREATE VNPAY PAYMENT URL
========================================= */
router.post("/create-payment", async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount || !orderId || Number.isNaN(Number(amount))) {
      return res.status(400).json({
        error: "Missing or invalid amount/orderId",
      });
    }

    const vnp_TmnCode = process.env.VNP_TMNCODE;
    const vnp_HashSecret = process.env.VNP_HASHSECRET;
    const vnp_Url = process.env.VNP_URL;
    const vnp_ReturnUrl = process.env.VNP_RETURNURL;

    if (!vnp_TmnCode || !vnp_HashSecret || !vnp_Url || !vnp_ReturnUrl) {
      return res.status(500).json({
        error: "Missing VNPay environment variables",
      });
    }

    const date = new Date();

    const createDate =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0") +
      String(date.getHours()).padStart(2, "0") +
      String(date.getMinutes()).padStart(2, "0") +
      String(date.getSeconds()).padStart(2, "0");

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode,
      vnp_Amount: Number(amount) * 100,
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: "other",
      vnp_Locale: "vn",
      vnp_ReturnUrl,
      vnp_IpAddr:
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.ip ||
        "127.0.0.1",
      vnp_CreateDate: createDate,
    };

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, {
      encode: false,
    });

    const hmac = crypto.createHmac("sha512", vnp_HashSecret);

    const signed = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    vnp_Params.vnp_SecureHash = signed;

    const paymentUrl =
      `${vnp_Url}?` +
      qs.stringify(vnp_Params, {
        encode: false,
      });

    console.log("✅ VNPay Payment URL:", paymentUrl);

    return res.json({
      success: true,
      paymentUrl,
    });
  } catch (error) {
    console.error("❌ VNPay create-payment error:", error);

    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/* =========================================
   VNPAY RETURN CALLBACK
========================================= */
router.get("/return", async (req, res) => {
  try {
    let vnp_Params = { ...req.query };

    const secureHash = vnp_Params.vnp_SecureHash;

    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, {
      encode: false,
    });

    const hmac = crypto.createHmac(
      "sha512",
      process.env.VNP_HASHSECRET
    );

    const signed = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    const queryString = qs.stringify(req.query, {
      encode: false,
    });

    if (secureHash === signed) {
      if (req.query.vnp_ResponseCode === "00") {
        console.log("✅ VNPay payment success");

        return res.redirect(
          `${process.env.FRONTEND_URL}/payment/success?${queryString}`
        );
      }

      console.log("❌ VNPay payment failed");

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment/failure?${queryString}`
      );
    }

    console.log("❌ Invalid VNPay secure hash");

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment/failure?${queryString}`
    );
  } catch (error) {
    console.error("❌ VNPay return error:", error);

    return res.redirect(
      `${process.env.FRONTEND_URL}/payment/failure`
    );
  }
});

module.exports = router;