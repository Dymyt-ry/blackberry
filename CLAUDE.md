# blackberry

## Project Map
Závazná pravidla a workflows jsou v `.ai/rules/`:
- `architecture.md` — project-specific architektura, data flow, role
- `workflow.md` — universal workflow rules (3-agent pipeline, Ruflo,
  Codex usage)
- `PROJECT.md` (root) — **co projekt dělá + inventář** pro agenty z jiných
  adresářů. Drž `## Co to dělá` / `## Stav` aktuální; po změně struktury
  spusť `refresh-project-map`. Auto-generuje se při první session.

Symlink: `.claude/rules/` → `../.ai/rules/`

Ruflo capability reference: `.claude-flow/CAPABILITIES.md` (MCP nástroje,
agent typy, swarm topologie, hook events).

## Quick Reference

**Research workflow**: pro current/external data (vendor pricing,
recent API changes, regulační updaty) Claude **automaticky** pustí
NotebookLM research pipeline (viz globální `~/.claude/CLAUDE.md` +
`.ai/rules/workflow.md`) — NEČEKÁ na `/three-agent-research`, ten command
je jen manuální zkratka. Claude prior knowledge je zastaralé,
nepoužívat na "podle mého" tvrzení o aktuálním stavu světa.

**Memory layer**: durable cross-session rozhodnutí ukládat do Ruflo
flat memory (`memory_store`, namespace `shared-memory`). NIKDY tam
neukládat secrets (API keys, OAuth tokens, passwords) — store je plain
SQLite, nešifrovaný.

**Code facts**: "kde je X / co volá Y" → `rg` / `Read`, ne memory.
Code truth žije v kódu.

Plné pravidla viz `.ai/rules/workflow.md`.

## First use on new project

```bash
cp -r ~/dev/_template-claude-project ~/projects/<new-project>
cd ~/projects/<new-project>
# Edit CLAUDE.md → nahraď blackberry
# Vyplň .ai/rules/architecture.md project-specifika
claude
```

**Nemazej `memory.db` ani `ruvector.db`** — `cp -r` přenese 5 workflow
seed entries z template a `npx ruflo memory init` (pokud bys ho pustil)
je idempotentní = nesmaže existující data. Seed entries v novém
projektu **chceš** mít.

## ⚠️ Setup warning — neuspěchat Ruflo init

Tento projekt už má hotový `.claude/settings.json`, `CLAUDE.md` (tenhle
soubor) a `.mcp.json` z template. **NIKDY zde nespouštěj `npx ruflo
init`** — přepíše ti je svými defaulty.

Bezpečné Ruflo příkazy:
- `npx ruflo memory init` — idempotent re-init memory store (nemaže data)
- `bash scripts/seed-workflow.sh` — (re-)seed workflow patternů
  (`--upsert`, takže idempotent)
- `npx ruflo memory list -n shared-memory` — ověř obsah
