const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const {
  processGalleryImage,
  deleteGalleryImages,
} = require('../utils/imageProcessor');

function serializeGallery(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    image: row.image || null,
    displayOrder: row.display_order,
    status: row.status,
    isVisible: row.status === 'Visible',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readImageMetadata(imagePath) {
  if (!imagePath) {
    return { bytes: 0, width: 0, height: 0 };
  }

  const normalizedPath = imagePath.replace(/^\/+/, '');
  const filePath = path.join(__dirname, '..', normalizedPath);

  if (!fs.existsSync(filePath)) {
    return { bytes: 0, width: 0, height: 0 };
  }

  const [metadata, stat] = await Promise.all([
    sharp(filePath).metadata(),
    fs.promises.stat(filePath),
  ]);

  return {
    bytes: stat.size,
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

const list = asyncHandler(async (req, res) => {
  const { q = '', includeHidden = 'false' } = req.query;
  const shouldIncludeHidden = includeHidden === 'true' || includeHidden === '1' || Boolean(req.user);

  let sql = 'SELECT * FROM gallery';
  const params = [];
  const conditions = [];

  if (!shouldIncludeHidden) {
    conditions.push("status = 'Visible'");
  }

  if (q.trim()) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (conditions.length) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ' ORDER BY display_order ASC, created_at DESC';

  const [rows] = await db.query(sql, params);
  res.json({ gallery: rows.map(serializeGallery) });
});

const create = asyncHandler(async (req, res) => {
  const { title, description = '', displayOrder = 0, status = 'Visible' } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Gallery image is required' });
  }

  const fileName = crypto.randomUUID();
  const image = await processGalleryImage(req.file.buffer, fileName);

  const [result] = await db.query(
    `INSERT INTO gallery (title, description, image, display_order, status)
     VALUES (?, ?, ?, ?, ?)`,
    [title.trim(), description.trim(), image.full, Number(displayOrder) || 0, status]
  );

  const [rows] = await db.query('SELECT * FROM gallery WHERE id = ?', [result.insertId]);
  res.status(201).json({ gallery: serializeGallery(rows[0]) });
});

const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [existingRows] = await db.query('SELECT * FROM gallery WHERE id = ?', [id]);

  if (!existingRows.length) {
    return res.status(404).json({ error: 'Gallery item not found' });
  }

  const existing = existingRows[0];
  const { title, description, displayOrder, status } = req.body;
  let image = existing.image;

  if (req.file) {
    const fileName = crypto.randomUUID();
    const uploaded = await processGalleryImage(req.file.buffer, fileName);
    image = uploaded.full;

    if (existing.image) {
      await deleteGalleryImages({ full: existing.image });
    }
  }

  await db.query(
    `UPDATE gallery SET title = ?, description = ?, image = ?, display_order = ?, status = ? WHERE id = ?`,
    [
      title ?? existing.title,
      description ?? existing.description,
      image,
      displayOrder ?? existing.display_order,
      status ?? existing.status,
      id,
    ]
  );

  const [rows] = await db.query('SELECT * FROM gallery WHERE id = ?', [id]);
  res.json({ gallery: serializeGallery(rows[0]) });
});

const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.query('SELECT * FROM gallery WHERE id = ?', [id]);

  if (!rows.length) {
    return res.status(404).json({ error: 'Gallery item not found' });
  }

  if (rows[0].image) {
    await deleteGalleryImages({ full: rows[0].image });
  }

  await db.query('DELETE FROM gallery WHERE id = ?', [id]);
  res.json({ success: true, message: 'Gallery item deleted successfully' });
});

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Gallery image is required' });
  }

  const fileName = crypto.randomUUID();
  const image = await processGalleryImage(req.file.buffer, fileName);
  res.status(201).json({ image: image.full, thumbnail: image.thumb });
});

module.exports = {
  list,
  create,
  update,
  remove,
  uploadImage,
  readImageMetadata,
  serializeGallery,
};