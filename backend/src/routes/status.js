var express = require('express');
var cache = require('../cache');
var registry = require('../gateways/registry');
var router = express.Router();

// Unauthenticated health check. Includes per-network health so the device can
// show a "WhatsApp degraded" badge without needing a separate authed call.
router.get('/', function (req, res) {
  res.json({
    status: 'ok',
    networks: registry.enabledNetworks(),
    health: cache.getHealth()
  });
});

module.exports = router;
