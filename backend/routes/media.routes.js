const express = require('express');
const mediaController = require('../controllers/mediaController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', mediaController.list);
router.delete('/:id', mediaController.remove);

module.exports = router;