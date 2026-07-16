/**
 * Shared request validators, built on express-validator.
 * Each export is an array of middleware; controllers run `validate` after
 * them to turn any failures into a single, friendly 400 response.
 */
const { body, validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// Sri Lankan mobile numbers, same rule as the storefront checkout form:
// 07XXXXXXXX, +947XXXXXXXX, or 947XXXXXXXX.
const LK_PHONE_REGEX = /^(?:\+94|94|0)?7\d{8}$/;

const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const categoryRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Category name must be 2–60 characters.'),
];

const productRules = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Product name must be 2–120 characters.'),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Description is too long.'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('categoryId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid category.'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be true or false.'),
];

const orderStatusRules = [
  body('status')
    .isIn(['Pending', 'Preparing', 'Completed', 'Cancelled'])
    .withMessage('Status must be one of Pending, Preparing, Completed, Cancelled.'),
];

// Used by the public order-submission endpoint the storefront calls.
const publicOrderRules = [
  body('customerName').trim().notEmpty().withMessage('Customer name is required.'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required.')
    .bail()
    .customSanitizer((v) => v.replace(/[\s-]/g, ''))
    .matches(LK_PHONE_REGEX)
    .withMessage('Enter a valid Sri Lankan phone number.'),
  body('address').trim().notEmpty().withMessage('Delivery address is required.'),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item.'),
  body('items.*.name').trim().notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unitPrice').isFloat({ min: 0 }),
];

module.exports = {
  validate,
  loginRules,
  categoryRules,
  productRules,
  orderStatusRules,
  publicOrderRules,
  LK_PHONE_REGEX,
};
