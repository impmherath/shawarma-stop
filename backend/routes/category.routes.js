const express = require('express');
const categoryController = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');
const { validate, categoryRules } = require('../utils/validators');

const router = express.Router();

router.use(requireAuth); // every category route requires a logged-in admin

router.get('/', categoryController.list);
router.post('/', categoryRules, validate, categoryController.create);
router.put('/:id', categoryRules, validate, categoryController.update);
router.delete('/:id', categoryController.remove);

module.exports = router;
