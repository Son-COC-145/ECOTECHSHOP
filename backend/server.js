// backend/server.js
const express = require("express");
const path = require("path");
const http = require("http");
const vnpayRoutes = require("./routes/vnpayRoutes");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");

const { connectDB } = require("./config/db");
const { loadWord2Vec } = require("./utils/word2vecSearch");

/* ============================
   INIT APP
   ============================ */
const app = express();

/* ============================
   CONNECT DATABASE
   ============================ */
connectDB();

/* ============================
   LOAD WORD2VEC (NON-BLOCKING)
   ============================ */
(async () => {
  try {
    console.log("🔄 Loading Word2Vec model...");
    await loadWord2Vec();
    console.log("✅ Word2Vec model ready!");
  } catch (err) {
    console.error("❌ Failed to load Word2Vec model:", err.message);
  }
})();

/* ============================
   HTTP SERVER + SOCKET.IO
   ============================ */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

/* ============================
   GLOBAL MIDDLEWARE
   ============================ */
app.use(helmet());
app.use(morgan("dev"));

app.use(cors({
  origin: [
    "http://localhost:3000",
      "http://localhost:3001",
      "https://ecotech-frontend-three.vercel.app",
      "https://ecotech-admin.vercel.app"
  ],
  credentials: true
}));

app.options("*", cors());

app.use(express.json({ limit: "50mb" }));

app.use("/api/vnpay", vnpayRoutes);

/* ============================
   CLOUDINARY CHECK (SAFE)
   ============================ */
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.warn("⚠️ Cloudinary is not fully configured. Upload features may not work.");
}

/* ============================
   ROUTES
   ============================ */
app.use("/api/chatbot", require("./routes/ChatBotRoutes"));
app.use("/api/recommend", require("./routes/RecommendRoutes"));
app.use("/api/auth", require("./routes/AuthRoutes"));
app.use("/api/users", require("./routes/UserRoutes"));
app.use("/api/reviews", require("./routes/ReviewRoutes"));
app.use("/api/products", require("./routes/ProductRoutes"));
app.use("/api/product-images", require("./routes/ProductImageRoutes"));
app.use("/api/orders", require("./routes/OrderRoutes"));
app.use("/api/cart", require("./routes/CartRoutes"));
app.use("/api/address", require("./routes/AddressRoutes"));
app.use("/api/categories", require("./routes/CategoryRoutes"));
app.use("/api/attributes", require("./routes/AttributeRoutes"));
app.use(
  "/api/product-attribute-values",
  require("./routes/ProductAttributeValueRoutes")
);
app.use("/api/prices", require("./routes/PriceRoutes"));
app.use("/api/summary", require("./routes/SummaryRoutes"));
app.use("/api/related", require("./routes/RelatedRoutes"));
app.use("/api/search", require("./routes/SearchRoutes"));
app.use("/api/upload", require("./routes/UploadRoutes"));

/* ============================
   SOCKET SUMMARY ENDPOINT
   ============================ */
app.post("/api/summaries", (req, res) => {
  const { reviewId, productId, summary } = req.body;
  io.emit("review_summary", { reviewId, productId, summary });
  res.json({ message: "✅ Summary broadcasted successfully" });
});

/* ============================
   DEFAULT ROUTES
   ============================ */
app.get("/", (req, res) => {
  res.json({ message: "🚀 Backend API is running successfully!" });
});

app.use((req, res) => {
  res.status(404).json({ message: "❌ Route not found" });
});

/* ============================
   ERROR HANDLER
   ============================ */
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    message: "❌ Internal Server Error",
    error: err.message,
  });
});

/* ============================
   START SERVER (SAFE)
   ============================ */
const PORT = process.env.PORT || 5000;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error("❌ Server error:", err);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
