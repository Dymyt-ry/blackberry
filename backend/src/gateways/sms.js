// SMS gateway — a self-hosted Android SMS gateway on a spare SIM phone.
//
// This is the cleanest second network: REST + webhook shaped, your own SIM and
// account (no platform ToS/ban problem — only carrier fair-use applies).
// Primary adapter is SMSGate (sms-gate.app). httpSMS / textbee are structurally
// similar and can be slotted in at the marked points.
//
// conversationId = "sms:<phone>", e.g. "sms:+420777123456".

var axios = require('axios');
var config = require('../config');
var cache = require('../cache');

var NETWORK = 'sms';

function authHeader() {
  var creds = config.sms.user + ':' + config.sms.password;
  return 'Basic ' + Buffer.from(creds).toString('base64');
}

// chatId is the destination phone number.
function sendText(chatId, text) {
  if (config.sms.provider === 'smsgate') {
    return axios.post(config.sms.apiUrl + '/message', {
      message: text,
      phoneNumbers: [chatId]
    }, {
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' }
    }).then(function (res) {
      return { messageId: (res.data && res.data.id) || null };
    });
  }
  // --- extension point: add 'httpsms' / 'textbee' send here ---
  return Promise.reject(new Error('unsupported SMS_PROVIDER: ' + config.sms.provider));
}

// Inbound webhook (mounted at /webhook/sms). SMSGate posts an event like:
//   { event: "sms:received", payload: { message, phoneNumber, receivedAt } }
function handleWebhook(req, res) {
  try {
    // Webhook secret is enforced centrally in routes/webhook.js.
    var body = req.body || {};
    var p = body.payload || body;
    var from = p.phoneNumber || p.phone || p.from;
    var textMsg = p.message || p.text || p.content;

    if (from && typeof textMsg === 'string') {
      var ts = p.receivedAt ? Math.floor(new Date(p.receivedAt).getTime() / 1000)
                            : Math.floor(Date.now() / 1000);
      cache.upsertMessage({
        network: NETWORK,
        chatId: from,
        id: p.id || ('sms_in_' + ts + '_' + Math.random().toString(36).substr(2, 6)),
        fromMe: false,
        pushName: from,
        text: textMsg,
        timestamp: ts,
        type: 'text',
        mediaId: null
      });
    }
    cache.setHealth(NETWORK, 'ok', null);
    res.status(200).json({ received: true });
  } catch (e) {
    cache.setHealth(NETWORK, 'degraded', e.message);
    res.status(200).json({ received: false });
  }
}

module.exports = {
  id: NETWORK,
  sendCapability: true,
  sendText: sendText,
  handleWebhook: handleWebhook
};
