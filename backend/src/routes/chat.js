var express = require('express');
var cache = require('../cache');
var router = express.Router();

// GET /chat/:id — messages for one conversation. :id is the composite
// "${network}:${chatId}" (URL-encoded by the client). Opening a chat clears its
// unread counter.
router.get('/:id', function (req, res) {
  var id = req.params.id;
  cache.clearUnread(id);
  res.json(cache.getMessages(id));
});

// POST /chat/:id/rename  { name }
router.post('/:id/rename', function (req, res) {
  var name = (req.body && req.body.name) || '';
  cache.renameConversation(req.params.id, name.trim());
  res.json({ ok: true });
});

module.exports = router;
