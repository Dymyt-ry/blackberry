// WhatsApp gateway — Evolution API v2 (Baileys engine).
//
// Ported from the proven BBWA backend. v2 is required: it exposes *Alt fields
// (remoteJidAlt / participantAlt) that carry real phone numbers instead of @lid
// pseudonyms, avoiding 406 errors when replying to unsaved contacts.
//
// Use a DEDICATED WhatsApp number — the unofficial multi-device API carries a
// real (known/accepted) ban risk.

var axios = require('axios');
var config = require('../config');
var cache = require('../cache');

var NETWORK = 'whatsapp';

function stripSuffix(jid) {
  if (!jid) return jid;
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@lid$/, '');
}

function sendText(chatId, text) {
  var number = (chatId.indexOf('@g.us') !== -1)
    ? chatId
    : stripSuffix(chatId);
  var url = config.whatsapp.apiUrl + '/message/sendText/' + config.whatsapp.instance;
  return axios.post(url, { number: number, text: text }, {
    headers: { apikey: config.whatsapp.apiKey, 'Content-Type': 'application/json' }
  }).then(function (res) {
    return { messageId: (res.data && res.data.key && res.data.key.id) || null };
  });
}

function fetchGroupName(rawJid, chatId) {
  var entry = cache.getConversation(cache.convId(NETWORK, chatId));
  if (entry && entry.name && entry.name !== 'Group' && !entry.customName) return;
  axios.get(
    config.whatsapp.apiUrl + '/group/findGroupInfos/' + config.whatsapp.instance,
    { params: { groupJid: rawJid }, headers: { apikey: config.whatsapp.apiKey } }
  ).then(function (r) {
    if (r.data && r.data.subject) {
      cache.updateGroupName(cache.convId(NETWORK, chatId), r.data.subject);
    }
  }).catch(function () {});
}

function processMessage(data) {
  if (!data || !data.key) return;
  var key = data.key;
  var text = '';
  var type = 'text';
  var mediaId = null;

  if (data.message) {
    if (data.message.imageMessage) {
      type = 'image';
      mediaId = key.id;
      text = data.message.imageMessage.caption || '';
    } else {
      text = data.message.conversation
        || (data.message.extendedTextMessage && data.message.extendedTextMessage.text)
        || '';
    }
  }

  var timestamp = data.messageTimestamp;
  if (typeof timestamp === 'string') timestamp = parseInt(timestamp, 10);
  timestamp = timestamp || Math.floor(Date.now() / 1000);

  // Prefer *Alt (real phone) over @lid pseudonyms.
  var rawJid = key.remoteJidAlt || key.remoteJid;
  var chatId = stripSuffix(rawJid);

  cache.upsertMessage({
    network: NETWORK,
    chatId: chatId,
    id: key.id,
    fromMe: key.fromMe || false,
    pushName: data.pushName || null,
    text: text,
    timestamp: timestamp,
    type: type,
    mediaId: mediaId
  });

  if (rawJid && rawJid.indexOf('@g.us') !== -1) fetchGroupName(rawJid, chatId);
}

// Evolution API webhook receiver (mounted at /webhook/whatsapp).
function handleWebhook(req, res) {
  try {
    var event = req.body;
    if (event && event.event === 'messages.upsert') {
      var data = event.data;
      if (data && data.message && data.message.reactionMessage) {
        var rm = data.message.reactionMessage;
        var targetId = rm.key && rm.key.id;
        var chatId = rm.key && stripSuffix(rm.key.remoteJid);
        if (targetId && chatId) {
          cache.addReaction(cache.convId(NETWORK, chatId), targetId, rm.text || '');
        }
      } else {
        processMessage(data);
      }
    }
    cache.setHealth(NETWORK, 'ok', null);
    res.status(200).json({ received: true });
  } catch (e) {
    cache.setHealth(NETWORK, 'degraded', e.message);
    res.status(200).json({ received: false });
  }
}

// Register this backend's webhook URL with Evolution API on startup.
// Fires-and-forgets; never crashes the process on failure.
function init() {
  var webhookUrl = config.whatsapp.webhookUrl;
  if (!webhookUrl) {
    console.warn('[whatsapp] EVO_WEBHOOK_URL not set — webhook not auto-registered');
    return;
  }
  var url = config.whatsapp.apiUrl + '/webhook/set/' + config.whatsapp.instance;
  axios.post(url, {
    url: webhookUrl,
    webhook_by_events: false,
    webhook_base64: false,
    events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE']
  }, {
    headers: { apikey: config.whatsapp.apiKey, 'Content-Type': 'application/json' }
  }).then(function () {
    console.log('[whatsapp] webhook registered → ' + webhookUrl);
  }).catch(function (e) {
    console.error('[whatsapp] webhook registration failed: ' + e.message);
  });
}

module.exports = {
  id: NETWORK,
  init: init,
  sendCapability: true,
  sendText: sendText,
  handleWebhook: handleWebhook
};
