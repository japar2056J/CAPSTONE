const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/audit - admin only
router.get('/', verifyToken, requireAdmin, auditController.getAuditLogs);

module.exports = router;
