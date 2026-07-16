const express = require('express');
const productController = require('../controllers/productController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validate, productRules } = require('../utils/validators');

const router = express.Router();

// Public: the storefront's menu (if it's ever moved server-side) or admin
// preview can read products without auth. Only writes require login.
router.get('/', productController.list);
router.get('/:id', productController.getOne);

router.use(requireAuth);

router.post('/', upload.single('image'), productRules, validate, productController.create);
router.put('/:id', upload.single('image'), productController.update);
router.delete('/:id', productController.remove);

module.exports = router;
