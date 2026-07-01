# Workflow Rules — universal across projects

## Tool routing — kdy co použít

| Typ otázky | První volba | Druhá volba | Proč |
|---|---|---|---|
| Library / SDK / framework docs | `mcp__context7-plugin__query-docs` | `gemini -p` | Context7 indexovaný; Gemini až když Context7 nemá |
| Aktuální API stav platforem, recent changes, regulační updaty | NotebookLM (`/three-agent-research`) | `gemini -p` fallback → `WebFetch` | NotebookLM grounded v reálných zdrojích, cituje; Gemini cappuje/halucinuje |
| Lokální/Office soubor (docx/xlsx/pptx/img) → text pro LLM | `markitdown <soubor>` | — | Čistý md, NotebookLM ani Claude je jinak nepřečtou |
| Fakta o vlastním kódu / "kde je X definováno" | `Read` / `Grep` (`rg`) | — | Code truth žije v kódu |
| Durable cross-session **rozhodnutí** | `mcp__ruflo__memory_search_unified` PŘED Read | `memory_store` po | Cross-Codex paměť |
| Code dependency / "co volá Y" | `rg` | — | Deterministický, levný, current |

## Research pipeline (canonical)

Pro **external / current data** Claude **automaticky** spustí tenhle flow
(NEČEKÁ na `/three-agent-research` — ten command je jen manuální zkratka).
Engine je **NotebookLM** (grounded, cituje), Gemini je fallback,
markitdown je ingest adaptér:

0. **Auth check** — `notebooklm auth check --test --json` (status:ok +
   checks.token_fetch:true); když nejde → Gemini fallback
1. **Ingest (volitelně)** — lokální/Office soubory → `markitdown f > md`
2. **NotebookLM research** — `notebooklm create`, `source add-research
   "<q>" --mode deep --from web --import-all --cited-only --no-wait`,
   `research wait --import-all`; vždy `--notebook <ID>` (parallel-safe)
3. **Grounded summary** — `notebooklm ask "..." -n <ID>` (Claude nečte
   všechny zdroje, dostane grounded shrnutí s citacemi)
4. **WebFetch spot-check** — pro KAŽDÉ číslo/cenu/limit/endpoint na zdroj
5. **Write proposal** — `/tmp/<topic>-proposal.md` s `UNVERIFIED` flagy
6. **Codex adversarial review** — `codex exec --sandbox read-only`
7. **Report ALL findings** — bez filtrování

**Gemini fallback** (NotebookLM down / auth nejde): `gemini -p
"<structured>"` timeout 300s run_in_background → WebFetch → proposal →
Codex → report.

## Download / install safety — vetuj každý externí kód

Než stáhneš/nainstaluješ cokoli (git clone, pip/npm/uv/go/brew install,
npx, `curl|sh`): prověř to. Plná procedura v globálním `~/.claude/CLAUDE.md`
("Download / install safety"), připomíná PreToolUse hook
`~/.claude/hooks/vet-downloads.sh`. Stručně: zdroj/autor known? → klonuj do
`/tmp/vet-*` (NEspouštěj install skripty) → `guarddog pypi|npm scan <path>`
+ `osv-scanner scan source -r <path>` + **`scan-iocs --root <path>`**
(known-bad IOC databáze: Shai-Hulud kompromitované balíky, node-ipc hashe,
catbox/metadata exfil) → prebuilt binárky ověř checksum/podpis + `vt`
VirusTotal hash → report verdikt. Stack v `~/.local/bin`. **Semgrep musí
být na PATH** jinak guarddog rules skipnou. Po podezřelém installu:
`scan-iocs --home --home-dir ~` (kontrola plant-persistence). Auto-guardraily:
`config-protection.js` (blok editů linter configů), `context-monitor.js`
(warn na kontext/cost/loop) — viz globální `~/.claude/CLAUDE.md`.

## Web automation / anti-bot — stealth scraping & login

Pro scraping/automatizaci webů s bot-detekcí nebo auto-login je stealth
stack. **Jen authorized targety** (vlastní účty, public data, souhlas);
respektuj ToS/právo. Plné info v globálním `~/.claude/CLAUDE.md`
("Web automation / anti-bot"). Eskalace lehké→těžké:
- **`header-generator`** (npm) — realistické HTTP hlavičky pro čisté HTTP scrapy.
- **`fingerprint-generator`+`fingerprint-injector`** (npm) — fingerprint do Playwright/Puppeteer.
- **`cloakbrowser`** (pip/npm) — stealth Chromium, drop-in Playwright, projde Cloudflare/FingerprintJS, `humanize=True` na auto-login.

**Prebuilt, NEbuilduj monorepo:** balíky jsou v `~/dev/.stealth-tools/`
(NODE_PATH v `.zshrc` → `require` odkudkoli), helper `stealth.cjs`.
`~/dev/fingerprint-suite` = jen zdroják pro vetting, neimportovat.

## Ovládání aplikací/UI — CLI-Anything (`cli-hub`)

Místo křehké GUI automatizace zkus hotové agent-native CLI: `cli-hub
list|search "<q>"|info <n>|install <n>|launch <n>`. Pokrývá Blender,
draw.io, browser/Safari, ComfyUI, n8n, Ollama, OBS… (`--json` output).
Plné info v globálním `~/.claude/CLAUDE.md`. Repo: `~/dev/cli-anything`.

## Utility: it-tools (offline toolbox) + privacy CLI

- **`it-tools`** (shell launcher) — offline self-host dev toolbox v
  prohlížeči (JSON/JWT/hash/base64/cron/regex/UUID…). Pro **interaktivní**
  převody nabídni uživateli; programově to dělej nativně sám.
- **Privacy CLI** (z awesome-privacy): `age` (file/secret encryption),
  `exiftool -all=` (strip EXIF/GPS před sdílením fotek/PDF), `rm -P` /
  `gshred` (secure delete). Plné info v globálním `~/.claude/CLAUDE.md`.

Variace **`/three-guards`** (opt-in pro rizikové PR): 3 paralelní
Codex reviews (Architect / Security / QA), neshoda = signal.

## Cross-validation pravidla pro Gemini výstup

1. URL ze zdroje → `WebFetch` před stavěním kódu/rozhodnutí
2. Čísla, ceny, limity, datumy → primární zdroj
3. "Podle [X]" bez URL → **nepřebírat** jako fakt

## Gemini invocation pravidla

- **VŽDY** používej `run_in_background: true` s timeout `300000` ms (5 min).
- Nikdy nevolej `gemini -p` synchronně — i triviální query může hit
  90s+ kvůli Google Search latency, default Bash timeout je 120s →
  spadne SIGTERM.
- Pro polling completion použij notification (harness signalizuje) — ne
  sleep loop.

## Changelog research — release tracks

Při výzkumu API/SDK changelogů vždy per-claim disambiguuj **release
track** (stable / preview / RC / beta / canary). Aggregating tools jako
Gemini ten kontext ztrácí a sloučí breaking changes z preview tracku do
stable seznamu.

Per-item check format:
| Claim | URL (primary doc) | Release track | Evidence excerpt |

Platí pro Stripe, Anthropic, OpenAI, Google APIs, jakýkoli vendor s
multi-track release modelem.

## Ruflo memory — kdy a NE-kdy

**Use `memory_store` / `memory_search_unified` WHEN:**
- Durable cross-session decisions (architecture, vendor verdicts,
  incident learnings)
- Non-derivable knowledge (team conventions, user preferences)

**Use native `rg` / `Read` WHEN:**
- "Kde je X definováno / co volá Y" → code truth lives in code

**NEVER store v Ruflo memory:**
- API klíče, OAuth tokeny, secrets, hesla, encryption keys
- Ruflo store je plain SQLite + JSON fallback, **NENÍ šifrovaný**
- Secrets patří do `.env*` nebo do šifrovaného storage (pgcrypto atp.)

## Codex invocation modes

| Účel | Volání | Sandbox |
|---|---|---|
| Adversarial review (auto) | stop-time review gate | `read-only` |
| Diagnostika / explain | `companion task "..."` | `read-only` |
| Skutečné psaní kódu | `companion task --write "..."` | `workspace-write` |

**Codex exec invokace (read-only review, mimo plugin):**
```
codex exec --sandbox read-only --skip-git-repo-check "<review prompt>"
```
`--skip-git-repo-check` je nutný v non-git workdirs (jinak interaktivní
prompt). Pro write tasks: `--sandbox workspace-write`.

`workspace-write` sandbox je omezený na aktuální workspace adresář.
Když Codex review flagne issue, **NEODFILTROVÁVEJ** ji bez explicitního
důvodu zaznamenaného uživateli.

`/codex:rescue` slash command je broken forwarder — použít `companion
task` přímo přes bash.

## Známé bugy / workarounds

- **`agentdb_hierarchical-recall`**: dělá substring match místo HNSW
  vector similarity. Verbose query vrací prázdno. **Workaround**: flat
  `memory_store` / `memory_search_unified` (HNSW funguje).
- **Pattern intelligence summaries**: někdy zobrazí `---` (YAML
  frontmatter delimiter) místo prose. Bug v
  `auto-memory-bridge.js:505`. Ignorovat summary, číst actual content.

## Závazné workflow rules

1. **Commit before changes** — před úpravou commitni rozpracované změny
2. **No AI logos** — nikdy negenerovat loga přes AI image gen
3. **Codex review je nezávislý** — flagy nevyfiltrovávat bez důvodu
4. **Gemini cross-validation** — výstupy ověřit `WebFetch`em na zdroj
5. **Ruflo memory bez secrets** — viz výše
6. **Memory pattern** — pro decisions, ne pro "kde je X v kódu"
