const { db } = require('../config/db');
const { admin } = require('../config/firebase');

// Log user action untuk audit trail
// Accepts ipAddress from middleware for accurate client IP
exports.logAction = async (userId, action, resource, resourceId, changes = {}, ipAddress = 'unknown') => {
  try {
    const auditLog = {
      userId,
      action, // 'CREATE', 'READ', 'UPDATE', 'DELETE'
      resource, // 'vendor', 'product', 'component', etc
      resourceId,
      changes,
      // Top-level copies of common fields so older records and UI can read them easily
      method: changes?.method || null,
      statusCode: changes?.statusCode || null,
      path: changes?.path || null,
      durationMs: changes?.durationMs || null,
      // Use serverTimestamp so Firestore orders and indexes correctly
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: ipAddress || 'unknown'
    };

    await db.collection('audit_logs').add(auditLog);
    return true;
  } catch (error) {
    console.error('Error logging action:', error);
    return false;
  }
};

// Helper to normalize Firestore Timestamp to ISO string
const normalizeDoc = (doc) => {
  const data = doc.data();
  const ts = data.timestamp;
  return {
    id: doc.id,
    ...data,
    timestamp: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : (ts || null)
  };
};

// Get audit logs
exports.getAuditLogs = async (filters = {}) => {
  try {
    let query = db.collection('audit_logs');

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }

    if (filters.action) {
      query = query.where('action', '==', filters.action);
    }

    if (filters.resource) {
      query = query.where('resource', '==', filters.resource);
    }

    if (filters.resourceId) {
      query = query.where('resourceId', '==', filters.resourceId);
    }

    const limit = parseInt(filters.limit, 10) || 100;

    const snapshot = await query.orderBy('timestamp', 'desc').limit(limit).get();
    
    const logs = [];
    snapshot.forEach(doc => {
      logs.push(normalizeDoc(doc));
    });

    return logs;
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
};

// Get audit logs by resource
exports.getAuditLogsByResource = async (resource, resourceId) => {
  try {
    const snapshot = await db.collection('audit_logs')
      .where('resource', '==', resource)
      .where('resourceId', '==', resourceId)
      .orderBy('timestamp', 'desc')
      .get();

    const logs = [];
    snapshot.forEach(doc => {
      logs.push(normalizeDoc(doc));
    });

    return logs;
  } catch (error) {
    console.error('Error getting audit logs by resource:', error);
    return [];
  }
};
