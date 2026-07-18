const express = require('express');
const galleryController = require('../controllers/galleryController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validate, galleryRules } = require('../utils/validators');

const router = express.Router();

router.get('/', galleryController.list);

router.use(requireAuth);

router.post('/', upload.single('image'), galleryRules, validate, galleryController.create);
router.post('/upload-image', upload.single('image'), galleryController.uploadImage);
router.put('/:id', upload.single('image'), galleryRules, validate, galleryController.update);
router.delete('/:id', galleryController.remove);

module.exports = router;