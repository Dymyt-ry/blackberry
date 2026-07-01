var express = require('express');
var cache = require('../cache');
var router = express.Router();

// GET /chats — unified conversation list across all networks, newest first.
// Each item carries `network` and `networkStatus` for the device UI.
router.get('/', function (req, res) {
  res.json(cache.getConversations());
});

module.exports = router;
