/**
 * Products CRUD, including image upload/replace/delete via the Sharp
 * pipeline in utils/imageProcessor.js.
 */

const crypto = require('crypto');
const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const { processProductImage, deleteProductImages } = require('../utils/imageProcessor');

function serializeProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image_full ? { full: row.image_full, thumb: row.image_thumb } : null,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    isAvailable: !!row.is_available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BASE_QUERY = `
  SELECT p.*, c.name AS category_name,
         p.image_path AS image_full,
         REPLACE(p.image_path, '-full.webp', '-thumb.webp') AS image_thumb
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

const list = asyncHandler(async (req, res) => {
  const { category, search, availability } = req.query;
  const clauses = [];
  const params = [];

  if (category) {
    clauses.push('p.category_id = ?');
    params.push(category);
  }
  if (search) {
    clauses.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (availability === 'available') clauses.push('p.is_available = 1');
  if (availability === 'unavailable') clauses.push('p.is_available = 0');

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`${BASE_QUERY} ${where} ORDER BY p.created_at DESC`).all(...params);

  res.json({ products: rows.map(serializeProduct) });
});

const getOne = asyncHandler(async (req, res) => {
  const row = db.prepare(`${BASE_QUERY} WHERE p.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: serializeProduct(row) });
});

const create = asyncHandler(async (req, res) => {
  const { name, description = '', price, categoryId, isAvailable } = req.body;

  let imagePath = null;
  if (req.file) {
    const baseName = crypto.randomUUID();
    const outputs = await processProductImage(req.file.buffer, baseName);
    imagePath = outputs.full; // thumb path is derived by string-replace when reading
  }

  const result = db
    .prepare(
      `INSERT INTO products (name, description, price, image_path, category_id, is_available)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      description.trim(),
      Number(price),
      imagePath,
      categoryId || null,
      isAvailable === 'false' || isAvailable === false ? 0 : 1
    );

  const row = db.prepare(`${BASE_QUERY} WHERE p.id = ?`).get(result.lastInsertRowid);
  res.status(201).json({ product: serializeProduct(row) });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  const { name, description, price, categoryId, isAvailable, removeImage } = req.body;

  let imagePath = existing.image_path;

  if (req.file) {
    // Replacing the image — process the new one, then delete the old files.
    const baseName = crypto.randomUUID();
    const outputs = await processProductImage(req.file.buffer, baseName);
    if (existing.image_path) {
      await deleteProductImages({
        full: existing.image_path,
        thumb: existing.image_path.replace('-full.webp', '-thumb.webp'),
      });
    }
    imagePath = outputs.full;
  } else if (removeImage === 'true' || removeImage === true) {
    if (existing.image_path) {
      await deleteProductImages({
        full: existing.image_path,
        thumb: existing.image_path.replace('-full.webp', '-thumb.webp'),
      });
    }
    imagePath = null;
  }

  db.prepare(
    `UPDATE products
     SET name = ?, description = ?, price = ?, image_path = ?, category_id = ?,
         is_available = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    name !== undefined ? name.trim() : existing.name,
    description !== undefined ? description.trim() : existing.description,
    price !== undefined ? Number(price) : existing.price,
    imagePath,
    categoryId !== undefined ? categoryId || null : existing.category_id,
    isAvailable !== undefined ? (isAvailable === 'false' || isAvailable === false ? 0 : 1) : existing.is_available,
    id
  );

  const row = db.prepare(`${BASE_QUERY} WHERE p.id = ?`).get(id);
  res.json({ product: serializeProduct(row) });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  if (existing.image_path) {
    await deleteProductImages({
      full: existing.image_path,
      thumb: existing.image_path.replace('-full.webp', '-thumb.webp'),
    });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = { list, getOne, create, update, remove };
