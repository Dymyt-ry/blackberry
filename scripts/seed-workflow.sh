#!/usr/bin/env bash
# Seed workflow memory entries into Ruflo store (namespace: shared-memory).
# Idempotent via --upsert. Run after `ruflo memory init` on a new project.
#
# Usage: bash scripts/seed-workflow.sh

set -euo pipefail

# Prefer local devDep binary; fall back to npx.
if [[ -x "./node_modules/.bin/ruflo" ]]; then
  RUFLO="./node_modules/.bin/ruflo"
else
  RUFLO="npx ruflo@latest"
fi

NS="shared-memory"

store() {
  local key="$1"
  local value="$2"
  $RUFLO memory store -k "$key" -n "$NS" --upsert --value "$value" >/dev/null
  echo "  ✓ $key"
}

echo "Seeding workflow memory into namespace '$NS'..."

store "workflow:three-agent-pipeline" \
"Default pipeline pro external/current data: Gemini web research → WebFetch cross-validation → write proposal /tmp/<topic>-proposal.md with UNVERIFIED flags → Codex adversarial review (read-only sandbox) → report ALL findings bez filtrování. Slash command: /three-agent-research."

store "workflow:ruflo-no-secrets" \
"NIKDY neukládat API keys / OAuth tokens / passwords / encryption keys / jakékoli secrets do Ruflo memory. Store je plain SQLite + JSON fallback, NENÍ šifrovaný. Secrets patří do .env* nebo pgcrypto-encrypted storage."

store "workflow:codex-companion-modes" \
"Codex companion modes — read-only pro review/diagnostika (default), workspace-write pro skutečné psaní kódu (companion task --write). /codex:rescue slash je broken forwarder, použít companion task přímo přes bash. Codex sandbox workspace-write je omezený na aktuální workspace."

store "workflow:hierarchical-recall-broken" \
"agentdb_hierarchical-recall dělá substring match místo HNSW vector similarity. Verbose semantic queries vrací prázdno. Workaround: flat memory_store / memory_search_unified (HNSW funguje korektně)."

store "workflow:gemini-cross-validation" \
"Gemini výstupy s URL zdrojem → MUSÍ se WebFetchem ověřit než se na nich postaví kód/rozhodnutí. Čísla, ceny, limity, datumy → primární zdroj. \"Podle [X]\" bez URL → nepřebírat jako fakt, vyžádat zdroj nebo přeskočit."

store "workflow:changelog-release-tracks" \
"Při research changelogů API/SDK vždy per-claim ověřit release track (stable vs preview/RC/beta/canary). Aggregating tools jako Gemini ten kontext ztrácí a sloučí breaking changes z preview tracku do stable seznamu. Per-item format: claim | URL | track | evidence excerpt. Platí pro Stripe (dahlia stable vs preview), Anthropic API, OpenAI, Google APIs."

echo "Done. Verify: $RUFLO memory list -n $NS"
