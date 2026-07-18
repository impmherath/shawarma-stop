const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const { deleteProductImages } = require('../utils/imageProcessor');
const { deleteGalleryImages } = require('../utils/imageProcessor');

function normalizeImagePath(imagePath) {
  return String(imagePath || '').replace(/^\/+/, '');
}

async function readImageInfo(imagePath) {
  if (!imagePath) {
    return { sizeBytes: 0, width: 0, height: 0 };
  }

  const filePath = path.join(__dirname, '..', normalizeImagePath(imagePath));
  if (!fs.existsSync(filePath)) {
    return { sizeBytes: 0, width: 0, height: 0 };
  }

  const [metadata, stat] = await Promise.all([
    sharp(filePath).metadata(),
    fs.promises.stat(filePath),
  ]);

  return {
    sizeBytes: stat.size,
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

function buildMediaId(type, id) {
  return `${type}:${id}`;
}

const list = asyncHandler(async (req, res) => {
  const { q = '', type = 'all' } = req.query;
  const items = [];

  const typeFilters = [];
  if (type === 'products' || type === 'all') {
    typeFilters.push('products');
  }
  if (type === 'gallery' || type === 'all') {
    typeFilters.push('gallery');
  }

  if (typeFilters.includes('products')) {
    const [products] = await db.query(
      `SELECT id, name AS title, description, image, created_at, updated_at
       FROM products
       WHERE image IS NOT NULL
         AND (? = '' OR name LIKE ? OR description LIKE ?)` ,
      [q.trim(), `%${q.trim()}%`, `%${q.trim()}%`]
    );

    for (const row of products) {
      const info = await readImageInfo(row.image);
      items.push({
        id: buildMediaId('product', row.id),
        sourceType: 'product',
        sourceId: row.id,
        title: row.title,
        description: row.description || '',
        image: row.image,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...info,
      });
    }
  }

  if (typeFilters.includes('gallery')) {
    const [gallery] = await db.query(
      `SELECT id, title, description, image, display_order, status, created_at, updated_at
       FROM gallery
       WHERE image IS NOT NULL
         AND (? = '' OR title LIKE ? OR description LIKE ?)` ,
      [q.trim(), `%${q.trim()}%`, `%${q.trim()}%`]
    );

    for (const row of gallery) {
      const info = await readImageInfo(row.image);
      items.push({
        id: buildMediaId('gallery', row.id),
        sourceType: 'gallery',
        sourceId: row.id,
        title: row.title,
        description: row.description || '',
        image: row.image,
        status: row.status,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...info,
      });
    }
  }

  res.json({ media: items });
});

const remove = asyncHandler(async (req, res) => {
  const [type, rawId] = String(req.params.id || '').split(':');
  const id = Number(rawId);

  if (!type || !Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid media identifier' });
  }

  if (type === 'product') {
    const [rows] = await db.query('SELECT image FROM products WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Media item not found' });
    if (rows[0].image) {
      await deleteProductImages({ full: rows[0].image });
      await db.query('UPDATE products SET image = NULL WHERE id = ?', [id]);
    }
    return res.json({ success: true, message: 'Product image deleted successfully' });
  }

  if (type === 'gallery') {
    const [rows] = await db.query('SELECT image FROM gallery WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Media item not found' });
    if (rows[0].image) {
      await deleteGalleryImages({ full: rows[0].image });
      await db.query('UPDATE gallery SET image = NULL WHERE id = ?', [id]);
    }
    return res.json({ success: true, message: 'Gallery image deleted successfully' });
  }

  return res.status(400).json({ error: 'Unsupported media type' });
});

module.exports = {
  list,
  remove,
};