const { admin } = require('../config/firebase');
const { collections } = require('../config/db');

// Verify Firebase token and attach minimal user info (uid, email)
// This middleware ONLY confirms the JWT is valid; it does NOT fetch role data.
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '')
      : authHeader;

    console.log('verifyToken: authHeader length =', authHeader ? authHeader.length : 0);

    // If Authorization header missing, try session cookie set by sessionLogin.
    let sessionCookie = null;
    if (!token) {
      sessionCookie = req.cookies && req.cookies.__session;
      if (sessionCookie) {
        console.log('verifyToken: using session cookie');
      } else {
        console.log('verifyToken: no token or session cookie provided');
        return res.status(401).json({ success: false, error: 'No token provided' });
      }
    }

    let decoded;

    // DEV MODE: Accept UID as token directly for testing
    const DEV_UID = 'HAzcED8RT4WiljQVFmbuOdLdDAt1';
    if (token === DEV_UID || sessionCookie === DEV_UID) {
      console.log('⚠️  DEV MODE: Using UID as token');
      decoded = { uid: token || sessionCookie, email: 'dev@example.com' };
    } else {
      try {
        // Production: Verify Firebase JWT (id token) OR session cookie
        if (sessionCookie) {
          decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
        } else {
          decoded = await admin.auth().verifyIdToken(token);
        }
      } catch (verifyErr) {
        console.error('verifyToken: token verification failed:', verifyErr.message || verifyErr);
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
    }

    // Attach minimal user info only
    // If decoded token doesn't include an email (session cookie may not),
    // fetch the user record to get the email for role evaluation.
    let userEmail = decoded.email;
    if (!userEmail) {
      try {
        const userRecord = await admin.auth().getUser(decoded.uid);
        userEmail = userRecord.email;
      } catch (err) {
        console.warn('verifyToken: unable to fetch user record for email fallback', err && err.message);
      }
    }

    req.user = {
      uid: decoded.uid,
      email: userEmail
    };

    console.log('verifyToken: decoded uid=', req.user.uid);

    return next();
  } catch (error) {
    console.error('verifyToken: unexpected error', error);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Require admin role — evaluate role at time of authorization
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      console.log('requireAdmin: no req.user or uid');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Fetch latest role from Firestore (live)
    const userDoc = await collections.users.doc(req.user.uid).get();
    // Allow role to be determined by stored Firestore value; if missing,
    // fall back to email-based rule for backwards compatibility.
    const emailIsAdmin = (req.user.email || '').endsWith('@admin.com');
    const role = userDoc.exists
      ? userDoc.data().role || (emailIsAdmin ? 'admin' : 'user')
      : (emailIsAdmin ? 'admin' : 'user');

    console.log('requireAdmin: uid=', req.user.uid, 'resolvedRole=', role, 'emailIsAdmin=', emailIsAdmin);

    if (role !== 'admin') {
      console.log('requireAdmin: rejecting non-admin user');
      return res.status(403).json({ success: false, error: 'Forbidden', role });
    }

    // Attach role for downstream handlers if needed
    req.user.role = role;

    return next();
  } catch (err) {
    console.error('Error checking admin role:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = {
  verifyToken,
  requireAdmin
};
