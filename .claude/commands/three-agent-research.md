---
description: Run grounded research pipeline (NotebookLM + markitdown + Codex)
---

Pipeline pro **external / current data**. Research engine je **NotebookLM**
(grounded ve skutečných zdrojích, cituje → míň halucinací než Gemini).
Gemini = fallback. markitdown = ingest adaptér pro lokální/Office soubory.

CLI binárky jsou ve venvu, ale symlinknuté do `~/.local/bin` → volej je
přímo: `notebooklm ...`, `markitdown ...`. (Venv: `~/dev/.research-venv`.)

## 0. Auth check (vždy první)

```bash
notebooklm auth check --test --json
# vyžaduj BOTH "status":"ok" AND "checks.token_fetch":true
# když selže → uživatel musí: notebooklm login   (otevře browser, Google sign-in)
```

NotebookLM stojí na **undocumented Google API** → když research selže nebo
auth nejde rozchodit, **fallback na Gemini** (`/three-agent-research` starý
flow: `gemini -p` v run_in_background, timeout 300s).

## 1. INGEST (volitelně) — lokální/Office soubory → md

NotebookLM nativně bere jen URL / PDF / YouTube / Drive. Pro **.docx /
.pptx / .xlsx / .xls / obrázky s textem** převeď přes markitdown:

```bash
markitdown ./report.docx  > /tmp/research/report.md
markitdown ./data.xlsx    > /tmp/research/data.md
# pak je přidáš jako zdroj v kroku 2 (notebooklm source add ./...md)
```

## 2. RESEARCH — NotebookLM auto-discovery + import

```bash
NB=$(notebooklm create "<téma>" --json | jq -r '.id')   # ulož notebook ID

# web research s auto-importem zdrojů (deep jen s --from web):
notebooklm source add-research "<research query>" \
    --mode deep --from web --import-all --cited-only --no-wait --notebook "$NB"

# deep běží dlouho → počkej non-blocking:
notebooklm research wait --import-all -n "$NB" --timeout 1800

# + tvoje known zdroje (URL/PDF/markitdown md):
notebooklm source add "https://..." --notebook "$NB"
notebooklm source add "/tmp/research/report.md" --notebook "$NB"
```

- `--cited-only` = importuj jen citované zdroje (lepší grounding kvalita)
- **Vždy passuj `--notebook "$NB"`** (ne `notebooklm use`) — parallel-safe,
  context.json se nepřepisuje mezi agenty
- deep mode **jen `--from web`**; pro Drive použij `--mode fast`

## 3. GROUNDED SUMMARY — ptej se, nečti všechny zdroje

Claude **nečte všech N zdrojů** — místo toho se ptá NotebookLM, který
odpoví grounded shrnutím s citacemi:

```bash
notebooklm ask "Shrň klíčová zjištění k <téma>, s citacemi zdrojů." -n "$NB"
notebooklm ask "Jaká konkrétní čísla/limity/ceny zdroje uvádějí?" -n "$NB"
notebooklm ask --prompt-file /tmp/research/long_question.txt -n "$NB"
```

## 4. SPOT-CHECK — WebFetch na kritická tvrzení

NotebookLM umí taky misattribute. Pro KAŽDÉ číslo / cenu / limit / endpoint,
na kterém stavíš kód nebo rozhodnutí → `WebFetch` na primární zdroj.
Per-claim release-track disambiguace platí dál (stable vs preview/RC).

## 5. WRITE PROPOSAL

`/tmp/<topic>-proposal.md` s explicit `UNVERIFIED` flagy pro nepotvrzená
tvrzení (NotebookLM odpověď bez WebFetch potvrzení = UNVERIFIED).

## 6. CODEX ADVERSARIAL REVIEW

```bash
codex exec --sandbox read-only --skip-git-repo-check "<review prompt>"
```

## 7. REPORT ALL FINDINGS — bez filtrování Codex verdiktu

## Gotchas

- **Auth stale** (Google rotuje SIDTS): `notebooklm auth refresh` (cheap,
  server-side) místo full re-login. Lze cronovat á 15–20 min.
- **Parallel agenti**: vždy `--notebook <ID>` / `-n <ID>`, ne `use`.
- **deep + drive** je rejected backendem — deep jen web.
- **Codex flag = neodfiltrovávat** bez důvodu zaznamenaného uživateli.
- **NotebookLM padne → Gemini fallback**, nezablokuj research na undocumented
  API výpadku.
