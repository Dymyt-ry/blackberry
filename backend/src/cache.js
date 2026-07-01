// Unified, multi-network in-memory message store.
//
// Populated by per-network gateways (webhook/poll -> upsertMessage), read by the
// device REST layer. This is the ONE place networks are normalized: every
// conversation and message carries a `network` tag and a composite id of the
// form `${network}:${chatId}` (e.g. "whatsapp:123@s.whatsapp.net", "sms:+420...").
//
// Design notes (from the architecture council, docs/adr/0001):
//  - Bounded: at most MAX_MESSAGES_PER_CONVERSATION kept per conversation, so a
//    chatty network can't OOM the aggregator.
//  - Fail-soft: gateways report health here; the device sees a per-network flag
//    and stale cache instead of a crash.
//  - Persistence is layered on top (see persistence.js) for dedupe + restart
//    recovery — this module stays pure in-memory and calls an onChange hook.

var config = require('./config');

var conversations = {};   // convId -> conversation object (globally bounded)
var messages = {};        // convId -> [message, ...] (bounded per conversation)
var seenIds = {};         // dedupe set (bounded, FIFO via seenOrder)
var seenOrder = [];       // insertion order of seenIds keys, for FIFO eviction
var health = {};          // network -> { status, lastEventAt, lastError }

var onChange = null;      // debounced snapshot hook, set by persistence.init()

function setOnChange(fn) { onChange = fn; }
function touched() { if (onChange) onChange(); }

function convId(network, chatId) { return network + ':' + chatId; }

function isGroup(network, chatId) {
  return network === 'whatsapp' && chatId.indexOf('@g.us') !== -1;
}

function displayName(msg, existing) {
  if (existing && existing.customName) return existing.customName;
  if (isGroup(msg.network, msg.chatId)) {
    return (existing && existing.name) || 'Group';
  }
  if (!msg.fromMe && msg.pushName) return msg.pushName;
  return (existing && existing.name) || msg.chatId;
}

function str(v) { return (typeof v === 'string') ? v : (v == null ? '' : String(v)); }

// Coerce/validate an inbound message from an untrusted webhook into a safe
// shape before it touches the cache or the snapshot. Returns null if unusable.
function normalize(raw) {
  if (!raw) return null;
  var network = str(raw.network).trim();
  var chatId = str(raw.chatId).trim();
  var id = str(raw.id).trim();
  if (!network || !chatId || !id) return null;

  var ts = Number(raw.timestamp);
  if (!isFinite(ts) || ts <= 0) ts = Math.floor(Date.now() / 1000);

  var text = str(raw.text);
  if (text.length > config.maxTextLength) text = text.slice(0, config.maxTextLength);

  var pushName = raw.pushName != null ? str(raw.pushName).slice(0, 256) : null;
  var type = str(raw.type) || 'text';

  return {
    network: network.slice(0, 32),
    chatId: chatId.slice(0, 256),
    id: id.slice(0, 256),
    fromMe: !!raw.fromMe,
    pushName: pushName,
    text: text,
    timestamp: Math.floor(ts),
    type: type.slice(0, 32),
    mediaId: raw.mediaId != null ? str(raw.mediaId).slice(0, 256) : null
  };
}

function markSeen(key) {
  seenIds[key] = true;
  seenOrder.push(key);
  while (seenOrder.length > config.maxSeenIds) {
    var old = seenOrder.shift();
    delete seenIds[old];
  }
}

// Evict the oldest conversations (by timestamp) once over the global cap.
function evictConversations() {
  var keys = Object.keys(conversations);
  if (keys.length <= config.maxConversations) return;
  keys.sort(function (a, b) {
    return conversations[a].timestamp - conversations[b].timestamp; // oldest first
  });
  var excess = keys.length - config.maxConversations;
  for (var i = 0; i < excess; i++) {
    delete conversations[keys[i]];
    delete messages[keys[i]];
  }
}

// raw: { network, chatId, id, fromMe, pushName, text, timestamp, type, mediaId }
function upsertMessage(raw) {
  var msg = normalize(raw);
  if (!msg) return false;

  // Dedupe key includes chatId so identical provider IDs in different chats
  // can't collide and silently drop a valid message.
  var dedupeKey = msg.network + ':' + msg.chatId + ':' + msg.id;
  if (seenIds[dedupeKey]) return false;
  markSeen(dedupeKey);

  var id = convId(msg.network, msg.chatId);
  var existing = conversations[id];

  conversations[id] = {
    id: id,
    network: msg.network,
    chatId: msg.chatId,
    name: displayName(msg, existing),
    customName: (existing && existing.customName) || null,
    lastMessage: (msg.type === 'image')
      ? (msg.text || '[Image]')
      : (msg.text || ''),
    timestamp: msg.timestamp,
    unreadCount: (existing && existing.unreadCount) || 0
  };
  if (!msg.fromMe) conversations[id].unreadCount++;

  if (!messages[id]) messages[id] = [];
  var notifyText = null;
  if (!msg.fromMe) {
    notifyText = (msg.pushName || msg.chatId) + ': ' + (msg.text || '[Media]');
  }
  messages[id].push({
    id: msg.id,
    network: msg.network,
    text: msg.text || '',
    fromMe: !!msg.fromMe,
    sender: msg.pushName || null,
    timestamp: msg.timestamp,
    notify: !msg.fromMe,
    notifyText: notifyText,
    type: msg.type || 'text',
    mediaId: msg.mediaId || null,
    reaction: null
  });

  // Bounded LRU: keep only the most recent N messages per conversation.
  var cap = config.maxMessagesPerConversation;
  if (messages[id].length > cap) {
    messages[id] = messages[id].slice(messages[id].length - cap);
  }

  // Global cap: bound the number of conversations too (evict oldest).
  if (!existing) evictConversations();

  touched();
  return true;
}

function addSentMessage(network, chatId, text, messageId) {
  var ts = Math.floor(Date.now() / 1000);
  var msg = {
    network: network,
    chatId: chatId,
    id: messageId || ('sent_' + ts + '_' + Math.random().toString(36).substr(2, 6)),
    fromMe: true,
    pushName: null,
    text: text,
    timestamp: ts,
    type: 'text',
    mediaId: null
  };
  upsertMessage(msg);
  return messages[convId(network, chatId)].slice(-1)[0];
}

function getConversations() {
  var list = Object.keys(conversations).map(function (k) {
    var c = conversations[k];
    return {
      id: c.id,
      network: c.network,
      name: c.name,
      lastMessage: c.lastMessage,
      timestamp: c.timestamp,
      unreadCount: c.unreadCount,
      networkStatus: (health[c.network] && health[c.network].status) || 'unknown'
    };
  });
  list.sort(function (a, b) { return b.timestamp - a.timestamp; });
  return list;
}

function getMessages(id) { return messages[id] || []; }

function getConversation(id) { return conversations[id] || null; }

function renameConversation(id, customName) {
  var c = conversations[id];
  if (!c) return;
  c.customName = customName;
  c.name = customName;
  touched();
}

function updateGroupName(id, name) {
  var c = conversations[id];
  if (c && !c.customName) { c.name = name; touched(); }
}

function clearUnread(id) {
  if (conversations[id]) { conversations[id].unreadCount = 0; touched(); }
}

function addReaction(id, targetMsgId, emoji) {
  var msgs = messages[id];
  if (!msgs) return;
  for (var i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].id === targetMsgId) {
      msgs[i].reaction = (emoji && emoji.length > 0) ? emoji : null;
      touched();
      return;
    }
  }
}

// ── per-network health (fail-soft) ───────────────────────────────────────────
function setHealth(network, status, error) {
  health[network] = {
    status: status,                       // 'ok' | 'degraded' | 'down'
    lastEventAt: Math.floor(Date.now() / 1000),
    lastError: error ? String(error).slice(0, 300) : null
  };
}
function getHealth() { return health; }

// ── persistence hooks ────────────────────────────────────────────────────────
function exportState() {
  return { conversations: conversations, messages: messages, seenIds: seenIds };
}
function importState(state) {
  if (!state) return;
  conversations = state.conversations || {};
  messages = state.messages || {};
  seenIds = state.seenIds || {};
  // Rebuild FIFO order and enforce caps on restored state.
  seenOrder = Object.keys(seenIds);
  while (seenOrder.length > config.maxSeenIds) {
    delete seenIds[seenOrder.shift()];
  }
  evictConversations();
}

module.exports = {
  convId: convId,
  upsertMessage: upsertMessage,
  addSentMessage: addSentMessage,
  getConversations: getConversations,
  getMessages: getMessages,
  getConversation: getConversation,
  renameConversation: renameConversation,
  updateGroupName: updateGroupName,
  clearUnread: clearUnread,
  addReaction: addReaction,
  setHealth: setHealth,
  getHealth: getHealth,
  setOnChange: setOnChange,
  exportState: exportState,
  importState: importState
};
