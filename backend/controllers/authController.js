/**
 * Auth controller — login issues an httpOnly JWT cookie, logout clears it.
 *
 * Login is deliberately generic on failure ("Invalid username or password")
 * so it doesn't reveal whether the username exists, and it's rate-limited
 * in server.js to slow down brute-force attempts.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { COOKIE_NAME } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

function cookieOptions(req) {
  const isProd = process.env.NODE_ENV === 'production';
  const isSecureRequest = Boolean(
    req.secure || req.headers['x-forwarded-proto'] === 'https'
  );
  const secure = isProd || isSecureRequest;

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

function clearCookieOptions(req) {
  const { maxAge, ...options } = cookieOptions(req);
  return options;
}

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const [rows] = await db.query(
    'SELECT * FROM users WHERE username = ?',
    [username]
);

const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const passwordOk = await bcrypt.compare(password, user.password);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.cookie(COOKIE_NAME, token, cookieOptions(req));
  res.json({ user: { id: user.id, username: user.username } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME, clearCookieOptions(req));
  res.json({ success: true });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { login, logout, me };
