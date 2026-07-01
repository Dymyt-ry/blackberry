# ADR 0001 — Backend architecture: per-network aggregation (not Matrix)

- **Status:** Accepted (2026-07-01)
- **Decider:** Tim (solo)
- **Input:** LLM council (Claude + Codex + Gemini-via-Antigravity), unanimous.

## Context

Build a Beeper-like unified-messaging **thin client** for a BlackBerry Classic
(BB10 / Android 4.3 / API 18). All heavy work runs on a VPS; the phone is a thin
native Java APK that polls a simple REST API. We clone the proven `gengi_whatsapp_client`
(BBWA) pattern: gateway → thin webhook-populated in-memory cache → API-18 polling
client. Goal: unify **WhatsApp + Instagram DM + TikTok DM + SMS** into one inbox.
Priority (user's words): *"the simplest and most optimized solution"*. Offline is a
nice-to-have, not required.

## Decision

**Option B — per-network gateway aggregation.** Each network is an independent
gateway that normalizes inbound messages into one `network`-tagged in-memory cache;
the device REST (`/chats`, `/chat/:id`, `/send`) is network-agnostic and routes
`/send` by `network`.

Rejected **Option A — Matrix homeserver + mautrix bridges as the universal
substrate**: for a single-user thin client that speaks plain REST, a homeserver +
Postgres + appservices is a Rube-Goldberg layer whose only job (normalization) we
already solve in Node. It also makes the homeserver a **single point of failure for
every network**.

### The nuance that matters

`mautrix-meta` (the best-maintained Instagram DM bridge) **is** a Matrix appservice —
it cannot run without a homeserver. So Option B is *not* literally "zero Matrix". The
distinction is **Matrix as universal substrate (A)** vs **Matrix as a contained
implementation detail of the single bridge — Instagram — that needs it (B)**. In B the
homeserver lives only inside an isolated Instagram box built **last**; WhatsApp, SMS,
and the device contract never touch Matrix.

## Rollout (value × reliability × reuse)

1. **WhatsApp — Evolution API v2 (Baileys).** MVP core; reuses BBWA verbatim, tagged
   `network:"whatsapp"`. Standardizes attachment/timestamp/sender handling.
2. **SMS — self-hosted Android SMS gateway** (SMSGate / textbee / httpSMS) on a spare
   SIM phone. Cleanest add: REST + webhook shaped, own SIM, lowest ban risk.
3. **Instagram — `mautrix-meta` in a contained homeserver** (Tuwunel/Dendrite,
   Synapse fallback). Highest effort + ban risk → last and isolated. Use the
   maintained bridge, **not** unmaintained standalone `instagram-private-api` libs.
4. **TikTok — schema stub only.** No viable DM API (Content Posting + Display APIs
   don't expose DMs; Shop messaging is gated). Disabled provider
   (`unsupported_no_official_dm_api`); zero code, zero UI promises.

**MVP = steps 1–2 (WhatsApp + SMS), no Matrix at all.**

## Consequences / design additions (beyond BBWA)

- **Per-network isolation** — each gateway fails independently; a broken/ banned
  network never dark-outs the others. (Run connectors as separate processes when
  Instagram lands.)
- **Bounded LRU cache** — cap messages per conversation so a chatty network can't OOM
  the aggregator (`MAX_MESSAGES_PER_CONVERSATION`).
- **Fail-soft** — gateways report health to the cache; the device sees a per-network
  status flag + stale cache instead of a crash.
- **Persistence** — a tiny debounced JSON snapshot for dedupe + restart recovery (not
  full history). Swap for SQLite only if it outgrows one write.

## Risks

- **Unofficial-bridge breakage** (Baileys, mautrix-meta) on Meta protocol shifts —
  weeks-to-months cadence; per-network isolation makes it survivable.
- **Account bans** — use dedicated/burner accounts, never personal. SMS on own SIM is
  the safe one (carrier fair-use aside).
- **ToS** — WA/IG/any-TikTok-relay violate platform ToS; keep it personal and quiet.
- **Homeserver currency** — conduwuit is archived (→ Tuwunel); smoke-test
  `mautrix-meta` double-puppeting on the chosen lightweight homeserver early.

## Open questions for Tim

- Is a burner Instagram account (that may get banned) acceptable? If not, drop IG.
- Acceptable message latency? AlarmManager polling interval + webhook→cache lag sets
  the floor.
