/**
 * Dashboard overview statistics.
 */
const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

const stats = asyncHandler(async (req, res) => {

  const [summary] = await db.query(
    `SELECT
      COUNT(*) AS totalOrders,
      COALESCE(SUM(total_amount), 0) AS totalRevenue,
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS todaysOrders,
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END), 0) AS todaysRevenue,
      COALESCE(SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END), 0) AS pendingOrders,
      COALESCE(SUM(CASE WHEN status = 'Preparing' THEN 1 ELSE 0 END), 0) AS preparingOrders,
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END), 0) AS completedOrders,
      COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelledOrders
     FROM orders`
  );

  const [products] = await db.query(
    'SELECT COUNT(*) AS n FROM products'
  );

  const [categories] = await db.query(
    'SELECT COUNT(*) AS n FROM categories'
  );

  const [orders] = await db.query(
    'SELECT COUNT(*) AS n FROM orders'
  );

  const [ordersByStatus] = await db.query(
    `SELECT status, COUNT(*) AS count 
     FROM orders 
     GROUP BY status`
  );

  const [dailyOrders] = await db.query(
    `SELECT DATE(created_at) AS label, COUNT(*) AS value
     FROM orders
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(created_at)
     ORDER BY label ASC`
  );

  const [weeklySales] = await db.query(
    `SELECT DATE_FORMAT(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY), '%Y-%m-%d') AS label,
            COALESCE(SUM(total_amount), 0) AS value
     FROM orders
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 WEEK)
     GROUP BY label
     ORDER BY label ASC`
  );

  const [monthlyRevenue] = await db.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS label,
            COALESCE(SUM(total_amount), 0) AS value
     FROM orders
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
     GROUP BY label
     ORDER BY label ASC`
  );

  const [recentOrders] = await db.query(
    `SELECT id, customer_name, phone, status, total_amount, created_at 
     FROM orders 
     ORDER BY created_at DESC 
     LIMIT 5`
  );


  res.json({
    totalRevenue: Number(summary[0].totalRevenue || 0),
    todaysRevenue: Number(summary[0].todaysRevenue || 0),
    pendingOrders: Number(summary[0].pendingOrders || 0),
    preparingOrders: Number(summary[0].preparingOrders || 0),
    completedOrders: Number(summary[0].completedOrders || 0),
    cancelledOrders: Number(summary[0].cancelledOrders || 0),
    totalProducts: products[0].n,
    totalCategories: categories[0].n,
    totalOrders: Number(summary[0].totalOrders || orders[0].n),
    todaysOrders: Number(summary[0].todaysOrders || 0),
    ordersByStatus,
    dailyOrders,
    weeklySales,
    monthlyRevenue,
    recentOrders,
  });

});

module.exports = { stats };