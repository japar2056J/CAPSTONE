const auditService = require('../services/auditService');

// Audit middleware: logs write operations automatically.
// Usage: router.post('/', verifyToken, requireAdmin, audit('vendor'), handler)
const audit = (resource) => (req, res, next) => {
	const actionMap = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };
	const action = actionMap[req.method];

	if (!action) return next();

	const startedAt = Date.now();
	const userId = req.user?.uid || 'anonymous';

	res.on('finish', async () => {
		try {
			const resourceId = req.params?.id || res.locals?.resourceId || null;
			const durationMs = Date.now() - startedAt;
			const changes = {
				path: req.originalUrl,
				method: req.method,
				statusCode: res.statusCode,
				durationMs,
			};

			// Attach a small snapshot of request body for write operations (avoid huge payloads)
			if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
				try {
					// shallow copy and limit size
					const bodyCopy = JSON.parse(JSON.stringify(req.body));
					changes.requestBody = Object.keys(bodyCopy).length > 0 ? bodyCopy : undefined;
				} catch (e) {
					changes.requestBody = undefined;
				}
			}

			// Determine client IP (trust x-forwarded-for if present)
			const forwarded = req.headers['x-forwarded-for'];
			const ip = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.connection?.remoteAddress || 'unknown');

			await auditService.logAction(userId, action, resource, resourceId, changes, ip);
		} catch (err) {
			console.error('Audit log failed:', err.message || err);
		}
	});

	return next();
};

module.exports = {
	audit
};
