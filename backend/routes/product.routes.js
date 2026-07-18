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
router.post('/upload-image', upload.single('image'), (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: 'Product image is required' });
	}

	const crypto = require('crypto');
	const { processProductImage } = require('../utils/imageProcessor');

	processProductImage(req.file.buffer, crypto.randomUUID())
		.then((image) => res.status(201).json({ image: image.full, thumbnail: image.thumb }))
		.catch((error) => res.status(500).json({ error: error.message || 'Unable to process image' }));
});
router.put('/:id', upload.single('image'), productRules, validate, productController.update);
router.delete('/:id', productController.remove);

module.exports = router;
