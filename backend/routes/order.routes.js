const express = require('express');
const rateLimit = require('express-rate-limit');
const orderController = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');
const { validate, orderStatusRules, publicOrderRules } = require('../utils/validators');

const router = express.Router();

// Public endpoint — called by the storefront checkout flow. Rate-limited
// since it has no auth: 20 orders per 15 minutes per IP is generous for a
// real customer, but blocks scripted abuse.
const publicOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many orders submitted. Please try again shortly.' },
});
router.post('/public', publicOrderLimiter, publicOrderRules, validate, orderController.createPublic);

// Everything below requires an authenticated admin.
router.use(requireAuth);

router.get('/', orderController.list);
router.get('/:id', orderController.getOne);
router.patch('/:id/status', orderStatusRules, validate, orderController.updateStatus);
router.delete('/:id', orderController.remove);

module.exports = router;
