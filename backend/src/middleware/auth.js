// Token auth. Every device-facing endpoint requires the `x-api-token` header to
// match AUTH_TOKEN. Webhook endpoints are unauthenticated (called by gateways)
// and do their own per-gateway secret checks.

var config = require('../config');

module.exports = function authMiddleware(req, res, next) {
  var token = req.headers['x-api-token'];
  if (!config.authToken || token !== config.authToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
};
