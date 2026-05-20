require("dotenv").config({
  path: "./.env.production",
});

const mysql = require("mysql2/promise");

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log("✅ Connected to Aiven MySQL");

    await connection.end();
  } catch (err) {
    console.error("❌ Connection failed");
    console.error(err);
  }
}

test();