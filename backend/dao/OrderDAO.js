const { getPool } = require("../config/db");

class OrderDAO {
  async getByUser(userId) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT 
        o.orderId,
        o.userId,
        o.addressId,
        o.totalPrice,
        o.orderStatus,
        o.paymentStatus,
        o.createdAt,
        a.fullName,
        a.phone,
        a.province,
        a.district,
        a.ward,
        a.detail,
        a.isDefault
      FROM Orders o
      LEFT JOIN Address a ON o.addressId = a.addressId
      WHERE o.userId = ?
      ORDER BY o.createdAt DESC
    `, [userId]);
    return rows;
  }

  async getAll() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT 
        o.orderId,
        o.userId,
        o.addressId,
        o.totalPrice,
        o.orderStatus,
        o.paymentStatus,
        CASE
          WHEN UPPER(COALESCE(o.paymentStatus, '')) = 'PAID' THEN 'PAID'
          WHEN UPPER(COALESCE(p.method, '')) <> 'COD' AND p.transactionCode IS NOT NULL THEN 'PAID'
          ELSE 'UNPAID'
        END AS effectivePaymentStatus,
        o.createdAt,
        u.username,
        u.email,
        a.fullName,
        a.phone,
        a.province,
        a.district,
        a.ward,
        a.detail,
        p.method AS paymentMethod
      FROM Orders o
      JOIN Users u ON o.userId = u.userId
      LEFT JOIN Address a ON o.addressId = a.addressId
      LEFT JOIN Payment p ON o.orderId = p.orderId
      ORDER BY o.createdAt DESC
    `);
    return rows;
  }

  async getAllPaginated({ page = 1, limit = 100, status = "All" } = {}) {
    const pool = getPool();
    const offset = (page - 1) * limit;

    let whereClause = "";
    const params = [];

    if (status && status !== "All") {
      whereClause = "WHERE o.orderStatus = ?";
      params.push(status);
    }

    // Đếm tổng
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Orders o 
      ${whereClause}
    `;
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Lấy danh sách orders với thông tin user
    const query = `
      SELECT 
        o.*,
        CASE
          WHEN UPPER(COALESCE(o.paymentStatus, '')) = 'PAID' THEN 'PAID'
          WHEN UPPER(COALESCE(p.method, '')) <> 'COD' AND p.transactionCode IS NOT NULL THEN 'PAID'
          ELSE 'UNPAID'
        END AS effectivePaymentStatus,
        u.username,
        u.email,
        a.fullName,
        a.phone,
        a.province,
        a.district,
        a.ward,
        a.detail,
        p.method AS paymentMethod
      FROM Orders o
      LEFT JOIN Users u ON o.userId = u.userId
      LEFT JOIN Address a ON o.addressId = a.addressId
      LEFT JOIN Payment p ON o.orderId = p.orderId
      ${whereClause}
      ORDER BY o.createdAt DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const [orders] = await pool.execute(query, params);

    return { orders, total };
  }

  async getById(orderId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `
      SELECT 
        o.*,
        CASE
          WHEN UPPER(COALESCE(o.paymentStatus, '')) = 'PAID' THEN 'PAID'
          WHEN UPPER(COALESCE(p.method, '')) <> 'COD' AND p.transactionCode IS NOT NULL THEN 'PAID'
          ELSE 'UNPAID'
        END AS effectivePaymentStatus,
        u.username,
        u.email,
        a.fullName,
        a.phone,
        a.province,
        a.district,
        a.ward,
        a.detail,
        p.method AS paymentMethod
      FROM Orders o
      LEFT JOIN Users u ON o.userId = u.userId
      LEFT JOIN Address a ON o.addressId = a.addressId
      LEFT JOIN Payment p ON o.orderId = p.orderId
      WHERE o.orderId = ?
      `,
      [orderId]
    );
    return rows[0] || null;
  }

  async getByTransactionCode(code) {
    const pool = getPool();
    // Tìm theo transactionCode (mã VNPay) hoặc theo transactionCode chính là txnRef
    const [rows] = await pool.execute(`
      SELECT o.*, p.transactionCode, p.method AS paymentMethod,
        CASE
          WHEN UPPER(COALESCE(o.paymentStatus, '')) = 'PAID' THEN 'PAID'
          WHEN UPPER(COALESCE(p.method, '')) <> 'COD' AND p.transactionCode IS NOT NULL THEN 'PAID'
          ELSE 'UNPAID'
        END AS effectivePaymentStatus
      FROM Orders o
      JOIN Payment p ON o.orderId = p.orderId
      WHERE p.transactionCode = ? OR p.transactionCode LIKE ?
    `, [code, `%${code}%`]);
    return rows[0];
  }

  async createOrder(order, items, transactionId) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      let addressId;

      // 1. Get or create Address
      if (order.addressId) {
        addressId = order.addressId;
      } else if (order.address) {
        const [addrResult] = await connection.execute(`
          INSERT INTO Address (
            userId, fullName, phone, province, district, ward, detail, isDefault, createdAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
        `, [
          order.userId,
          order.address.fullName,
          order.address.phone,
          order.address.province,
          order.address.district,
          order.address.ward,
          order.address.detail
        ]);
        addressId = addrResult.insertId;
      } else {
        throw new Error("Thiếu thông tin địa chỉ khi tạo đơn hàng");
      }

      // 2. Create Order
      const [orderResult] = await connection.execute(`
        INSERT INTO Orders (
          userId, addressId, totalPrice, orderStatus, paymentStatus, createdAt
        )
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        order.userId,
        addressId,
        order.totalPrice,
        order.orderStatus || 'Pending',
        order.paymentStatus || 'UNPAID'
      ]);
      const orderId = orderResult.insertId;

      // 3. Create OrderItems
      if (items && items.length) {
        for (const item of items) {
          await connection.execute(`
            INSERT INTO OrderItem (
              orderId, productId, productPriceId, productImageId, quantity, unitPrice
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            orderId,
            item.productId,
            item.productPriceId,
            item.productImageId,
            item.quantity,
            item.unitPrice
          ]);
        }
      }

      // 4. Create Payment
      if (transactionId) {
        await connection.execute(`
          INSERT INTO Payment (orderId, method, amount, transactionCode)
          VALUES (?, ?, ?, ?)
        `, [orderId, order.paymentMethod || 'Online', order.totalPrice, transactionId]);
      } else if (order.paymentMethod === 'COD') {
        await connection.execute(`
          INSERT INTO Payment (orderId, method, amount, transactionCode)
          VALUES (?, 'COD', ?, NULL)
        `, [orderId, order.totalPrice]);
      }

      await connection.commit();
      return orderId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateStatus(orderId, status) {
    const pool = getPool();

    if (status === 'Delivered') {
      const [rows] = await pool.execute(
        `SELECT
           o.paymentStatus,
           p.method AS paymentMethod,
           p.transactionCode,
           CASE
             WHEN UPPER(COALESCE(o.paymentStatus, '')) = 'PAID' THEN 'PAID'
             WHEN UPPER(COALESCE(p.method, '')) <> 'COD' AND p.transactionCode IS NOT NULL THEN 'PAID'
             ELSE 'UNPAID'
           END AS effectivePaymentStatus
         FROM Orders o
         LEFT JOIN Payment p ON o.orderId = p.orderId
         WHERE o.orderId = ?`,
        [orderId]
      );
      const order = rows[0];
      if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
      }
      if (String(order.effectivePaymentStatus).toUpperCase() !== 'PAID') {
        throw new Error('Đơn hàng chưa thanh toán, không thể xác nhận giao thành công.');
      }
    }

    await pool.execute(
      `UPDATE Orders SET orderStatus = ? WHERE orderId = ?`,
      [status, orderId]
    );
    return { orderId, status };
  }

  async updatePaymentStatus(orderId, paymentStatus) {
    const pool = getPool();
    await pool.execute(
      `UPDATE Orders SET paymentStatus = ? WHERE orderId = ?`,
      [paymentStatus, orderId]
    );
    return { orderId, paymentStatus };
  }

  async delete(orderId) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute('DELETE FROM OrderItem WHERE orderId = ?', [orderId]);
      await connection.execute('DELETE FROM Payment WHERE orderId = ?', [orderId]);
      await connection.execute('DELETE FROM Shipment WHERE orderId = ?', [orderId]);
      await connection.execute('DELETE FROM Orders WHERE orderId = ?', [orderId]);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getRevenue(startDate, endDate) {
    const pool = getPool();
    let query = `
      SELECT COALESCE(SUM(o.totalPrice), 0) AS totalRevenue
      FROM Orders o
      WHERE UPPER(o.paymentStatus) = 'PAID'
    `;
    const params = [];

    if (startDate) {
      query += ' AND o.createdAt >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND o.createdAt < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(endDate);
    }

    const [rows] = await pool.execute(query, params);
    return Number(rows[0]?.totalRevenue || 0);
  }

  async getStats(startDate, endDate) {
    const pool = getPool();

    // totalOrders
    const [ordersRes] = await pool.execute('SELECT COUNT(*) AS totalOrders FROM Orders');

    // totalProducts
    const [productsRes] = await pool.execute('SELECT COUNT(*) AS totalProducts FROM Product');

    // totalCustomers
    const [customersRes] = await pool.execute(`
      SELECT COUNT(*) AS totalCustomers
      FROM Users
      WHERE role IS NULL OR role <> 'admin'
    `);

    // revenue (PAID in range)
    let revenueQuery = `
      SELECT 
        COALESCE(SUM(o.totalPrice), 0) AS totalRevenue,
        COUNT(*) AS totalPaidOrders
      FROM Orders o
      WHERE UPPER(o.paymentStatus) = 'PAID'
    `;
    const revenueParams = [];

    if (startDate) {
      revenueQuery += ' AND o.createdAt >= ?';
      revenueParams.push(startDate);
    }
    if (endDate) {
      revenueQuery += ' AND o.createdAt < DATE_ADD(?, INTERVAL 1 DAY)';
      revenueParams.push(endDate);
    }

    const [revenueRes] = await pool.execute(revenueQuery, revenueParams);

    return {
      totalOrders: Number(ordersRes[0]?.totalOrders || 0),
      totalProducts: Number(productsRes[0]?.totalProducts || 0),
      totalCustomers: Number(customersRes[0]?.totalCustomers || 0),
      totalRevenue: Number(revenueRes[0]?.totalRevenue || 0),
      totalPaidOrders: Number(revenueRes[0]?.totalPaidOrders || 0),
      startDate: startDate || null,
      endDate: endDate || null,
      filter: "revenue: paymentStatus = PAID"
    };
  }

  async getRevenueByTime({ type = "month", year, month } = {}) {
    const pool = getPool();
    let selectTime = "";
    let groupBy = "";
    let orderBy = "";

    if (type === "year") {
      selectTime = "YEAR(o.createdAt) AS year";
      groupBy = "YEAR(o.createdAt)";
      orderBy = "YEAR(o.createdAt)";
    } else if (type === "day") {
      selectTime = "DATE(o.createdAt) AS date";
      groupBy = "DATE(o.createdAt)";
      orderBy = "DATE(o.createdAt)";
    } else {
      // month (default)
      selectTime = "YEAR(o.createdAt) AS year, MONTH(o.createdAt) AS month";
      groupBy = "YEAR(o.createdAt), MONTH(o.createdAt)";
      orderBy = "YEAR(o.createdAt), MONTH(o.createdAt)";
    }

    let whereClause = "WHERE UPPER(o.paymentStatus) = 'PAID'";
    const params = [];

    if (Number.isFinite(year)) {
      whereClause += " AND YEAR(o.createdAt) = ?";
      params.push(year);
    }
    if (type === "day" && Number.isFinite(month)) {
      whereClause += " AND MONTH(o.createdAt) = ?";
      params.push(month);
    }

    const query = `
      SELECT
        ${selectTime},
        COALESCE(SUM(o.totalPrice), 0) AS revenue,
        COUNT(*) AS orders
      FROM Orders o
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
    `;

    const [rows] = await pool.execute(query, params);
    let result = rows || [];

    // Fill missing months if type is "month" and year is provided
    if (type === "month" && Number.isFinite(year)) {
      const monthMap = new Map();
      for (const r of result) {
        monthMap.set(r.month, r);
      }
      const fullYear = [];
      for (let m = 1; m <= 12; m++) {
        if (monthMap.has(m)) {
          fullYear.push(monthMap.get(m));
        } else {
          fullYear.push({
            year: year,
            month: m,
            revenue: 0,
            orders: 0
          });
        }
      }
      result = fullYear;
    }

    return result;
  }
}

module.exports = new OrderDAO();