// BBMM backend — per-network gateway aggregator (Option B).
//
//   [ WhatsApp / Evolution ] ─┐
//   [ SMS gateway ]           ├─ webhook ─► gateways ─► unified cache ─► REST ─► BB10 client
//   [ Instagram / mautrix ]  ─┘                         (network-tagged)   (polling)
//
// Device REST is network-agnostic: /chats, /chat/:id, /send all carry `network`.

var express = require('express');
var cors = require('cors');

var config = require('./config');
var cache = require('./cache');
var persistence = require('./persistence');
var registry = require('./gateways/registry');
var authMiddleware = require('./middleware/auth');

var statusRouter = require('./routes/status');
var chatsRouter = require('./routes/chats');
var chatRouter = require('./routes/chat');
var sendRouter = require('./routes/send');
var webhookRouter = require('./routes/webhook');

// Restore last snapshot, then bring the gateways up.
persistence.init();
registry.init();

// Warn loudly about any enabled network whose inbound webhook is unauthenticated.
registry.enabledNetworks().forEach(function (network) {
  if (!config.webhookSecrets[network]) {
    console.warn('[security] /webhook/' + network + ' is UNAUTHENTICATED — set '
      + network.toUpperCase() + '_WEBHOOK_SECRET and register it with the gateway.');
  }
});

var app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Unauthenticated: health check + gateway webhooks (gateways verify own secrets).
app.use('/status', statusRouter);
app.use('/webhook', webhookRouter);

// Device-facing, token-authenticated.
app.use('/chats', authMiddleware, chatsRouter);
app.use('/chat', authMiddleware, chatRouter);
app.use('/send', authMiddleware, sendRouter);

app.listen(config.port, function () {
  console.log('BBMM backend listening on port ' + config.port
    + ' | networks: ' + registry.enabledNetworks().join(', '));
});

module.exports = app;
