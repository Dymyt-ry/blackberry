# blackberry — projektový descriptor pro agenty

> Čte ho agent (i z jiného adresáře) aby věděl **co projekt dělá a co v něm je**,
> bez nutnosti procházet celý strom. Prózu níž udržuj ručně (jako CLAUDE.md);
> inventář dole regeneruje `refresh-project-map`.

## Co to dělá
**Beeper-like sjednocený messaging thin-client pro BlackBerry Classic (BB10 /
Android 4.3 / API 18).** Sjednocuje WhatsApp + Instagram DM + (best-effort)
TikTok + SMS do jedné schránky. Veškerý backend běží na VPS; na telefonu jen
tenký nativní Java Android APK, který pouluje jednoduché REST API. Klonuje
architekturu z `gengi_whatsapp_client` (BBWA) — viz native memory
`bbwa-thin-client-pattern`: gateway → tenký Node in-memory cache (webhook-
populated, žádná DB) → API-18 polling klient (OkHttp 3.12.12, Holo AMOLED,
custom TLS 1.2, AlarmManager). Rozšíření pro multi-síť: `network` pole v data
modelu + pluggable gateway vrstva per síť.

## Stav / poznámky
**2026-07-01 — MVP postaven.** Architektura rozhodnuta councilem (ADR-0001,
native memory `backend-architecture-decision`): **Option B per-network aggregace**.

- **`backend/`** — HOTOVO + Codex-reviewed (6/6 nálezů opraveno). Node/Express
  unified cache + REST (`/chats`, `/chat/:id`, `/send`, `/webhook/:network`,
  `/status`). Gateways: whatsapp (Evolution API v2), sms (SMSGate). instagram =
  loud-fail placeholder (staví se poslední), tiktok = disabled stub. Boot + full
  pipeline otestován (SMS+WA webhook → unified /chats, auth, dedupe, caps).
- **`android/`** — thin-client napsán (`cz.webflex.bbmm`, API 18, port BBWA +
  `network` badge + network status). Text-focused MVP (image/reactions =
  follow-up). Resource cross-check + XML OK; build ověřován (Gradle 7.6.4).
- **Rollout:** WhatsApp+SMS = MVP (hotovo v kódu), Instagram (mautrix-meta) fast-
  follow, TikTok jen stub.

Infra: Antigravity CLI (`agy`) zvetováno + napojeno do `council` místo gemini
(GLOBAL-MEMORY). **Pozor:** NEspouštět `npx ruflo init` (přepíše config).

<!-- AUTO:INVENTORY (generuje refresh-project-map — needituj ručně) -->
**Stack:** Node

**Adresáře:** `android`, `backend`, `docs`, `scripts`

**Soubory:** `.mcp.json.disabled`, `CLAUDE.md`, `package.json`

_Refreshed: 2026-07-01 · `refresh-project-map`_
<!-- /AUTO:INVENTORY -->
