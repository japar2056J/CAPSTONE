const express = require('express');
const router = express.Router();
const estimationController = require('../controllers/estimationController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { audit } = require('../middleware/auditMiddleware');
const { requireFields } = require('../middleware/validationMiddleware');

// Estimation routes
// Allow any authenticated user to calculate and save estimations (not admin-only)
// Debugging middleware: log request auth header for diagnosis
router.use((req, res, next) => {
  console.log('estimationRoutes: Headers:', {authorization: req.headers.authorization});
  next();
});

// Public (no auth) route for debugging — only exposes calculation (no save)
// Remove this or secure before production
router.post('/calculate-public', requireFields(['productName']), audit('estimation'), estimationController.calculateEstimation);

router.post('/calculate', verifyToken, requireFields(['productName']), audit('estimation'), estimationController.calculateEstimation);
router.post('/save', verifyToken, requireFields(['productName', 'estimatedPrice', 'kurs']), audit('estimation'), estimationController.saveEstimation);

module.exports = router;
