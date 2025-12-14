// Simple validation helpers
const requireFields = (fields = []) => (req, res, next) => {
  const missing = fields.filter((f) => {
    const value = req.body?.[f];
    return value === undefined || value === null || value === '';
  });

  if (missing.length) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missing.join(', ')}`
    });
  }

  return next();
};

const requireBodyNotEmpty = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Request body is required'
    });
  }
  return next();
};

module.exports = {
  requireFields,
  requireBodyNotEmpty
};
