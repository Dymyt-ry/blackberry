// Instagram gateway — mautrix-meta on a CONTAINED homeserver (built LAST).
//
// Per the architecture council: use the maintained mautrix-meta bridge, NOT an
// unmaintained standalone Node instagram-private-api library. mautrix-meta is a
// Matrix appservice, so it needs a small homeserver (Tuwunel/Dendrite, Synapse
// as fallback) living in its OWN isolated box. This adapter reads only that
// bridge's rooms via the Matrix client-server API and normalizes into the cache.
//
// Not yet implemented — this is the Instagram fast-follow after WhatsApp + SMS.
// Enabling `instagram` before the box exists fails loudly (health -> down)
// instead of silently pretending to work.

var config = require('../config');

var NETWORK = 'instagram';

function init() {
  if (!config.instagram.homeserverUrl || !config.instagram.accessToken) {
    throw new Error('instagram gateway not configured — build the mautrix-meta box first (see docs/adr/0001)');
  }
  // TODO(instagram fast-follow):
  //  - open a Matrix CS API /sync loop against IG_HOMESERVER_URL with IG_ACCESS_TOKEN
  //  - map bridge rooms -> chatId "ig:<thread_id>", puppet users -> sender
  //  - cache.upsertMessage({ network: 'instagram', ... }) on m.room.message events
  throw new Error('instagram gateway not implemented yet (fast-follow)');
}

function sendText() {
  return Promise.reject(new Error('instagram gateway not implemented yet'));
}

module.exports = {
  id: NETWORK,
  sendCapability: true,
  init: init,
  sendText: sendText
};
