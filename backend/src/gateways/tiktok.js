// TikTok — SCHEMA STUB ONLY. Never enabled.
//
// There is no viable TikTok DM path: the official developer surface (Login Kit,
// Share Kit, Content Posting API, Display API, Research API, Data Portability)
// does NOT expose consumer DMs, and TikTok Shop messaging is gated off most
// accounts. The only "solution" is a fragile unofficial "log in as a real
// account" relay — the highest ban-risk and most aggressively policed of any
// network here. It is deliberately excluded (see docs/adr/0001).
//
// This module exists so `tiktok` has a defined, disabled provider state and can
// slot into the schema later IF a real API ever appears. The registry refuses
// to enable it regardless.

var NETWORK = 'tiktok';

module.exports = {
  id: NETWORK,
  status: 'unsupported_no_official_dm_api',
  sendCapability: false,
  sendText: function () {
    return Promise.reject(new Error('tiktok DMs are unsupported (no official API)'));
  }
};
