var express = require('express');
var registry = require('../gateways/registry');
var router = express.Router();

// POST /send  { conversationId, text }
// conversationId is "${network}:${chatId}"; the registry routes it to the owning
// gateway. On success returns the optimistic sent message (already in cache).
router.post('/', function (req, res) {
  var conversationId = req.body && (req.body.conversationId || req.body.chatId);
  var text = req.body && req.body.text;
  if (typeof conversationId !== 'string' || typeof text !== 'string'
      || !conversationId.trim() || !text.trim()) {
    return res.status(400).json({ error: 'conversationId and text (strings) are required' });
  }

  registry.sendText(conversationId.trim(), text.trim())
    .then(function (msg) { res.json({ sent: true, message: msg }); })
    .catch(function (err) {
      console.error('[send] failed for ' + conversationId + ': ' + err.message);
      res.status(502).json({ error: 'send failed', detail: err.message });
    });
});

module.exports = router;
