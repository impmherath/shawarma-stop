/**
 * Creates the first admin user. Run once: `npm run seed`.
 *
 * Reads credentials from environment variables so a real password never
 * has to be typed into a source file. Falls back to a clearly-labeled
 * default for quick local testing only.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.log(`Admin user "${username}" already exists — nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);

  console.log(`✅ Admin user created.`);
  console.log(`   Username: ${username}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`   Password: ${password}  (default — CHANGE THIS. Set SEED_ADMIN_PASSWORD env var instead.)`);
  } else {
    console.log(`   Password: (from SEED_ADMIN_PASSWORD env var)`);
  }
}

seed().then(() => process.exit(0));
