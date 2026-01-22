const crypto = require("crypto");

// DÁN SIGNDATA TỪ LOG VÀO ĐÂY
const signData = "vnp_Amount=9467000000&vnp_Command=pay&vnp_CreateDate=20251207060531&vnp_CurrCode=VND&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=iPhone 17 Pro Max 1TB - Chinh hang Apple Viet Nam x1 37.490.000 Loai 256GB Mau Cam vu tru iPhone 17 Pro Max 1TB - Chinh hang Apple Viet Nam x1 50.690.000 Loai 1TB Mau Xanh am Tai nghe AirPods Pro 3 - Chinh hang Apple Viet Nam x1 6.490.000 Mau Trang&vnp_OrderType=250000&vnp_ReturnUrl=https://030f8fa3acf8.ngrok-free.app/payment/return&vnp_TmnCode=YC1WJASH&vnp_TxnRef=1765087531533825&vnp_Version=2.1.0";

// DÁN SECRET MỚI COPY TỪ CỔNG VNPAY VÀO ĐÂY
const secret = "B0U9NPJ6G9BLLWEJFX4FCZYW56JNBQKJ";

const hmac = crypto.createHmac("sha512", secret);
const hash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
console.log("Hash:", hash);
