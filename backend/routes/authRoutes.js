const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register);
router.post('/verify-token', authController.verifyToken);
// Session cookie endpoints for Firebase session auth
router.post('/sessionLogin', authController.sessionLogin);
router.post('/sessionLogout', authController.sessionLogout);
// Admin-only endpoint to change a user's role
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
router.post('/promote', verifyToken, requireAdmin, authController.promoteUser);

// Return current authenticated user info and role
router.get('/me', verifyToken, async (req, res) => {
	try {
		// Fetch latest role from Firestore
		const userDoc = await require('../config/db').collections.users.doc(req.user.uid).get();
		const role = userDoc.exists ? userDoc.data().role || ((req.user.email || '').endsWith('@admin.com') ? 'admin' : 'user') : ((req.user.email || '').endsWith('@admin.com') ? 'admin' : 'user');
		return res.json({ success: true, data: { uid: req.user.uid, email: req.user.email, role } });
	} catch (err) {
		console.error('GET /auth/me error:', err);
		return res.status(500).json({ success: false, error: 'Server error' });
	}
});

module.exports = router;
