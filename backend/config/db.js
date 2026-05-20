const mysql = require("mysql2/promise");

const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ecodb",
  port: Number(process.env.DB_PORT) || 3306,

  // IMPORTANT FOR AIVEN
  ssl: {
    rejectUnauthorized: false,
  },

  // mysql2 options
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool(config);

    const connection = await pool.getConnection();

    console.log(
      `✅ Connected to MySQL (${config.host}:${config.port})`
    );

    console.log(`📊 Pool size: ${config.connectionLimit}`);

    connection.release();
  } catch (error) {
    console.error("❌ MySQL connection failed:", error);

    setTimeout(connectDB, 5000);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error("❌ MySQL pool not initialized");
  }

  return pool;
};

module.exports = { connectDB, getPool };