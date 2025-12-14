const express = require('express');
const router = express.Router();
const kursController = require('../controllers/kursController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { audit } = require('../middleware/auditMiddleware');
const { requireFields } = require('../middleware/validationMiddleware');

// Kurs routes
router.get('/', kursController.getKurs);
router.get('/:date', kursController.getKursByDate);
router.put('/', verifyToken, requireAdmin, requireFields(['value']), audit('kurs'), kursController.updateKurs);

module.exports = router;
