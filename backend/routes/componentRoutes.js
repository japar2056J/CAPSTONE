const express = require('express');
const router = express.Router();
const componentController = require('../controllers/componentController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { audit } = require('../middleware/auditMiddleware');
const { requireFields, requireBodyNotEmpty } = require('../middleware/validationMiddleware');

// All component routes require authentication
router.post('/', verifyToken, requireAdmin, requireFields(['name', 'category', 'specification', 'unit', 'price']), audit('component'), componentController.createComponent);
router.get('/', componentController.getAllComponents);
router.get('/:id', componentController.getComponentById);
router.get('/product/:productId', componentController.getComponentsByProduct);
router.put('/:id', verifyToken, requireAdmin, requireBodyNotEmpty, audit('component'), componentController.updateComponent);
router.delete('/:id', verifyToken, requireAdmin, audit('component'), componentController.deleteComponent);

module.exports = router;
