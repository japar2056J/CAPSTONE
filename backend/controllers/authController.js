const { auth } = require('../config/firebase');
const { collections } = require('../config/db');

// Register user
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const userRecord = await auth.createUser({
      email,
      password
    });

    // Determine role based on email (default rule, can be edited later in Firestore)
    const role = email.endsWith('@admin.com') ? 'admin' : 'user';

    // Persist user profile with role in Firestore so updates can be read live
    await collections.users.doc(userRecord.uid).set({
      email: userRecord.email,
      role,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Verify token
exports.verifyToken = async (req, res) => {
  try {
    // Accept either Authorization header or session cookie (__session)
    const token = req.headers.authorization?.split(' ')[1];
    const sessionCookie = req.cookies && req.cookies.__session;

    if (!token && !sessionCookie) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    let decodedToken;
    if (sessionCookie) {
      decodedToken = await require('../config/firebase').admin.auth().verifySessionCookie(sessionCookie, true);
    } else {
      decodedToken = await auth.verifyIdToken(token);
    }

    // Ensure we have latest role from Firestore; fallback to email rule if missing
    const userDoc = await collections.users.doc(decodedToken.uid).get();
    const email = decodedToken.email || (await require('../config/firebase').admin.auth().getUser(decodedToken.uid)).email;
    const role = userDoc.exists ? userDoc.data().role || (email.endsWith('@admin.com') ? 'admin' : 'user') : (email.endsWith('@admin.com') ? 'admin' : 'user');

    res.json({ success: true, data: { uid: decodedToken.uid, email, role } });
  } catch (error) {
    console.error('verifyToken error:', error && error.message);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Create Firebase session cookie from an ID token and set as cookie
exports.sessionLogin = async (req, res) => {
  try {
    const idToken = req.body.idToken || req.headers.authorization?.split(' ')[1];
    if (!idToken) return res.status(400).json({ success: false, error: 'idToken required' });

    // Set session expiration to 5 days (in milliseconds)
    const expiresIn = 5 * 24 * 60 * 60 * 1000;

    // Use admin SDK to create a session cookie
    const sessionCookie = await require('../config/firebase').admin.auth().createSessionCookie(idToken, { expiresIn });

    // Secure cookie options
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('__session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax'
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('sessionLogin error:', error);
    return res.status(401).json({ success: false, error: 'Failed to create session' });
  }
};

// Clear session cookie
exports.sessionLogout = async (req, res) => {
  try {
    res.clearCookie('__session');
    return res.json({ success: true });
  } catch (error) {
    console.error('sessionLogout error:', error);
    return res.status(500).json({ success: false, error: 'Failed to clear session' });
  }
};

// Promote or change a user's role (admin-only)
exports.promoteUser = async (req, res) => {
  try {
    const { uid, role } = req.body;
    if (!uid || !role) return res.status(400).json({ success: false, error: 'uid and role are required' });

    // Validate role
    const allowed = ['user', 'admin'];
    if (!allowed.includes(role)) return res.status(400).json({ success: false, error: 'Invalid role' });

    await collections.users.doc(uid).set({ role }, { merge: true });

    return res.json({ success: true, data: { uid, role } });
  } catch (error) {
    console.error('promoteUser error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
