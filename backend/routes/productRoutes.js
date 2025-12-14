const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { audit } = require('../middleware/auditMiddleware');
const { requireFields, requireBodyNotEmpty } = require('../middleware/validationMiddleware');

// All product routes require authentication
router.post('/', verifyToken, requireAdmin, requireFields(['name', 'vendorId', 'releaseDate']), audit('product'), productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', verifyToken, requireAdmin, requireBodyNotEmpty, audit('product'), productController.updateProduct);
router.delete('/:id', verifyToken, requireAdmin, audit('product'), productController.deleteProduct);

module.exports = router;
