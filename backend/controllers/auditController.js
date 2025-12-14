const auditService = require('../services/auditService');

// GET /api/audit
exports.getAuditLogs = async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      resource: req.query.resource,
      resourceId: req.query.resourceId,
      limit: req.query.limit
    };

    const logs = await auditService.getAuditLogs(filters);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('auditController.getAuditLogs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
};
