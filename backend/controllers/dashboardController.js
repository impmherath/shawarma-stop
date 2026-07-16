/**
 * Dashboard overview statistics.
 */
const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

const stats = asyncHandler(async (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  const totalCategories = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  const totalOrders = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
  const todaysOrders = db
    .prepare(`SELECT COUNT(*) AS n FROM orders WHERE date(created_at) = date('now')`)
    .get().n;

  const ordersByStatus = db
    .prepare(`SELECT status, COUNT(*) AS count FROM orders GROUP BY status`)
    .all();

  const recentOrders = db
    .prepare(`SELECT id, customer_name, status, total, created_at FROM orders ORDER BY created_at DESC LIMIT 5`)
    .all();

  res.json({
    totalProducts,
    totalCategories,
    totalOrders,
    todaysOrders,
    ordersByStatus,
    recentOrders,
  });
});

module.exports = { stats };
