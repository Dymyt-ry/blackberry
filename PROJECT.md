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
**2026-07-01 — start.** Baseline template commitnut (git init). Prostudována
reference BBWA. Nainstalováno + zvetováno Antigravity CLI (`agy`) a napojeno do
`council` místo rozbitého gemini legu (viz GLOBAL-MEMORY). Research feasibility
hotový (viz native memory `multi-network-bridge-feasibility`): WhatsApp přes
Evolution API v2 / mautrix, IG přes mautrix-meta, SMS přes Android SMS gateway
(textbee/httpSMS), **TikTok DM nemá viable API** (jen fragile unofficial). Běží
council na volbu backend architektury (Matrix+mautrix bridges vs per-síť gateway
agregace). Pozor: NEspouštět `npx ruflo init` (přepíše config).

<!-- AUTO:INVENTORY (generuje refresh-project-map — needituj ručně) -->
**Stack:** Node

**Adresáře:** `scripts`

**Soubory:** `.mcp.json.disabled`, `CLAUDE.md`, `council_stderr.log`, `package.json`

_Refreshed: 2026-07-01 · `refresh-project-map`_
<!-- /AUTO:INVENTORY -->
