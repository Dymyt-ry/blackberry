// Central config, resolved once from the environment.
require('dotenv').config();

function list(v, fallback) {
  return (v || fallback || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

var config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  authToken: process.env.AUTH_TOKEN || '',

  // Networks the operator turned on. `tiktok` is intentionally NOT enableable
  // (no viable DM API — see docs/adr/0001). It exists only as a schema stub.
  enabledNetworks: list(process.env.ENABLED_NETWORKS, 'whatsapp,sms'),

  snapshotPath: process.env.SNAPSHOT_PATH || './data/snapshot.json',

  // Bounds — keep the aggregator from growing unbounded (a spoofed/chatty
  // network otherwise OOMs it). See cache.js.
  maxMessagesPerConversation:
    parseInt(process.env.MAX_MESSAGES_PER_CONVERSATION, 10) || 300,
  maxConversations: parseInt(process.env.MAX_CONVERSATIONS, 10) || 1000,
  maxSeenIds: parseInt(process.env.MAX_SEEN_IDS, 10) || 20000,
  maxTextLength: parseInt(process.env.MAX_TEXT_LENGTH, 10) || 8192,

  whatsapp: {
    apiUrl: process.env.EVO_API_URL || '',
    instance: process.env.EVO_INSTANCE_NAME || '',
    apiKey: process.env.EVO_API_KEY || ''
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'smsgate',
    apiUrl: process.env.SMS_API_URL || '',
    user: process.env.SMS_API_USER || '',
    password: process.env.SMS_API_PASSWORD || ''
  },

  // Per-network inbound webhook secrets. Checked centrally in routes/webhook.js
  // (via ?secret= or x-webhook-secret header). If unset for an enabled network,
  // that webhook is UNAUTHENTICATED and index.js warns loudly at startup.
  webhookSecrets: {
    whatsapp: process.env.WA_WEBHOOK_SECRET || '',
    sms: process.env.SMS_WEBHOOK_SECRET || ''
  },

  instagram: {
    homeserverUrl: process.env.IG_HOMESERVER_URL || '',
    accessToken: process.env.IG_ACCESS_TOKEN || '',
    userId: process.env.IG_USER_ID || ''
  }
};

// Every network the schema knows about. `enabled` gates whether a gateway is
// actually wired up; `tiktok` can never be enabled.
config.KNOWN_NETWORKS = ['whatsapp', 'sms', 'instagram', 'tiktok'];

module.exports = config;
