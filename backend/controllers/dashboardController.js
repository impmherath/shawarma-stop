/**
 * Dashboard overview statistics.
 */
const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

const stats = asyncHandler(async (req, res) => {

  const [products] = await db.query(
    'SELECT COUNT(*) AS n FROM products'
  );

  const [categories] = await db.query(
    'SELECT COUNT(*) AS n FROM categories'
  );

  const [orders] = await db.query(
    'SELECT COUNT(*) AS n FROM orders'
  );

  const [todays] = await db.query(
    `SELECT COUNT(*) AS n 
     FROM orders 
     WHERE DATE(created_at) = CURDATE()`
  );

  const [ordersByStatus] = await db.query(
    `SELECT status, COUNT(*) AS count 
     FROM orders 
     GROUP BY status`
  );

  const [recentOrders] = await db.query(
    `SELECT id, customer_name, status, total_amount, created_at 
     FROM orders 
     ORDER BY created_at DESC 
     LIMIT 5`
  );


  res.json({
    totalProducts: products[0].n,
    totalCategories: categories[0].n,
    totalOrders: orders[0].n,
    todaysOrders: todays[0].n,
    ordersByStatus,
    recentOrders,
  });

});

module.exports = { stats };