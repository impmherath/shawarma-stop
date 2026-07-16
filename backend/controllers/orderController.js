/**
 * Orders — admin-facing management (list/search/filter/status/delete)
 * plus a public endpoint the storefront calls to save an order record
 * at the same moment it opens WhatsApp, so the admin dashboard has a
 * real log of orders instead of relying on WhatsApp alone.
 */
const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

function serializeOrder(order, items) {
  return {
    id: order.id,
    customerName: order.customer_name,
    phone: order.phone,
    address: order.address,
    note: order.note,
    status: order.status,
    total: order.total,
    source: order.source,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: items.map((i) => ({
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      subtotal: i.subtotal,
    })),
  };
}

const getItemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');

// ---- Admin endpoints -------------------------------------------------

const list = asyncHandler(async (req, res) => {
  const { search, status, dateFrom, dateTo } = req.query;
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('(customer_name LIKE ? OR phone LIKE ? OR address LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (dateFrom) {
    clauses.push('date(created_at) >= date(?)');
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push('date(created_at) <= date(?)');
    params.push(dateTo);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orders = db.prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC`).all(...params);

  const withItems = orders.map((o) => serializeOrder(o, getItemsStmt.all(o.id)));
  res.json({ orders: withItems });
});

const getOne = asyncHandler(async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order: serializeOrder(order, getItemsStmt.all(order.id)) });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.json({ order: serializeOrder(updated, getItemsStmt.all(id)) });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  db.prepare('DELETE FROM orders WHERE id = ?').run(id); // order_items cascade
  res.json({ success: true });
});

// ---- Public endpoint ---------------------------------------------------
// Called by the storefront's checkout flow right before it opens WhatsApp.
// Intentionally has no auth — it's the public "place an order" action —
// but is fully validated (see utils/validators.js#publicOrderRules) and
// rate-limited in server.js to prevent abuse.

const createPublic = asyncHandler(async (req, res) => {
  const { customerName, phone, address, note = '', items } = req.body;

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const insertOrder = db.prepare(
    `INSERT INTO orders (customer_name, phone, address, note, total, source)
     VALUES (?, ?, ?, ?, ?, 'website')`
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_name, quantity, unit_price, subtotal)
     VALUES (?, ?, ?, ?, ?)`
  );

  const orderId = db.transaction(() => {
    const result = insertOrder.run(customerName, phone, address, note, total);
    for (const item of items) {
      insertItem.run(result.lastInsertRowid, item.name, item.quantity, item.unitPrice, item.quantity * item.unitPrice);
    }
    return result.lastInsertRowid;
  })();

  res.status(201).json({ orderId });
});

module.exports = { list, getOne, updateStatus, remove, createPublic };
