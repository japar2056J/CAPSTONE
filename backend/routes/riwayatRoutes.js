const express = require('express');
const router = express.Router();
const riwayatController = require('../controllers/riwayatController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { audit } = require('../middleware/auditMiddleware');

// Riwayat routes
router.get('/', riwayatController.getAllRiwayat);
router.get('/year/:year', riwayatController.getRiwayatByYear);
router.get('/:id/pdf', riwayatController.generatePdf);
router.get('/:id', riwayatController.getRiwayatById);
router.delete('/:id', verifyToken, requireAdmin, audit('riwayat'), riwayatController.deleteRiwayat);

module.exports = router;
