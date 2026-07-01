// Gateway registry — the pluggable per-network layer (Option B).
//
// Each gateway module exports:
//   id            string, matches a `network` value
//   init()        optional; wire up polling / validate config
//   sendText(chatId, text) -> Promise<{ messageId }>
//   handleWebhook(req, res) optional; parse inbound events into cache
//   sendCapability boolean; whether the network can send (device greys out if false)
//
// Networks are isolated: a broken gateway never throws into the aggregator —
// send failures return a rejected promise the route turns into a 502, and
// inbound parse errors are caught and flip the network's health flag.

var config = require('./../config');
var cache = require('./../cache');

var MODULES = {
  whatsapp: './whatsapp',
  sms: './sms',
  instagram: './instagram',
  tiktok: './tiktok'
};

var gateways = {};   // network -> gateway instance

function init() {
  config.enabledNetworks.forEach(function (network) {
    if (network === 'tiktok') {
      console.warn('[registry] refusing to enable tiktok — no viable DM API (stub only)');
      return;
    }
    if (!MODULES[network]) {
      console.warn('[registry] unknown network in ENABLED_NETWORKS: ' + network);
      return;
    }
    try {
      var gw = require(MODULES[network]);
      if (gw.init) gw.init();
      gateways[network] = gw;
      cache.setHealth(network, 'ok', null);
      console.log('[registry] enabled gateway: ' + network);
    } catch (e) {
      console.error('[registry] failed to load gateway ' + network + ': ' + e.message);
      cache.setHealth(network, 'down', e.message);
    }
  });
}

function get(network) { return gateways[network] || null; }

function enabledNetworks() { return Object.keys(gateways); }

// Route an outbound send to the owning gateway. conversationId is
// `${network}:${chatId}`.
function sendText(conversationId, text) {
  var sep = conversationId.indexOf(':');
  var network = conversationId.slice(0, sep);
  var chatId = conversationId.slice(sep + 1);
  var gw = gateways[network];
  if (!gw) return Promise.reject(new Error('network not enabled: ' + network));
  if (!gw.sendText) return Promise.reject(new Error('network cannot send: ' + network));
  return gw.sendText(chatId, text).then(function (r) {
    cache.setHealth(network, 'ok', null);
    var msg = cache.addSentMessage(network, chatId, text, r && r.messageId);
    return msg;
  }).catch(function (err) {
    cache.setHealth(network, 'degraded', err.message);
    throw err;
  });
}

module.exports = {
  init: init,
  get: get,
  enabledNetworks: enabledNetworks,
  sendText: sendText
};
