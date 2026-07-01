var express = require('express');
var config = require('../config');
var registry = require('../gateways/registry');
var router = express.Router();

// Timing-safe-ish constant comparison (short secrets; avoids trivial length leak).
function secretOk(expected, got) {
  if (!got || typeof got !== 'string') return false;
  if (got.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
}

// POST /webhook/:network — inbound events from a network's gateway (Evolution
// API, SMS gateway, ...). Unauthenticated at the token layer, but gated by a
// per-network shared secret (?secret= or x-webhook-secret) when one is configured.
// Isolated so one gateway's parse error can't take down the aggregator.
router.post('/:network', function (req, res) {
  var network = req.params.network;
  var gw = registry.get(network);
  if (!gw || !gw.handleWebhook) {
    return res.status(404).json({ error: 'no webhook for network: ' + network });
  }

  var expected = config.webhookSecrets[network];
  if (expected) {
    var got = req.headers['x-webhook-secret'] || req.query.secret;
    if (!secretOk(expected, got)) {
      return res.status(401).json({ error: 'bad webhook secret' });
    }
  }

  gw.handleWebhook(req, res);
});

module.exports = router;
