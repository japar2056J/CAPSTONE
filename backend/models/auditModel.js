// Audit Model Structure
const auditModel = {
  userId: String,
  action: String, // 'CREATE', 'READ', 'UPDATE', 'DELETE'
  resource: String, // 'vendor', 'product', 'component'
  resourceId: String,
  changes: Object, // What was changed
  timestamp: String, // ISO Date
  ipAddress: String
};

module.exports = auditModel;
