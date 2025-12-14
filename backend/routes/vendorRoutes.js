const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { audit } = require('../middleware/auditMiddleware');
const { requireFields, requireBodyNotEmpty } = require('../middleware/validationMiddleware');

// All vendor routes require authentication
router.post('/', verifyToken, requireAdmin, requireFields(['name', 'contact', 'email', 'address']), audit('vendor'), vendorController.createVendor);
router.get('/', vendorController.getAllVendors);
router.get('/:id', vendorController.getVendorById);
router.put('/:id', verifyToken, requireAdmin, requireBodyNotEmpty, audit('vendor'), vendorController.updateVendor);
router.delete('/:id', verifyToken, requireAdmin, audit('vendor'), vendorController.deleteVendor);

module.exports = router;
