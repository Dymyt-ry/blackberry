---
description: Opt-in 3 parallel Codex reviews for risky PRs
---

Pro rizikové PR (security-sensitive, schema migrations, payment flows)
spusť 3 paralelní Codex companion tasks v read-only sandboxu:

1. **Architect review** — focus: layering, contracts, data flow,
   abstraction leaks
2. **Security review** — focus: auth, secrets, injection vectors,
   TOCTOU, IDOR, leakage
3. **QA review** — focus: edge cases, error handling, retry semantics,
   observability

Souhlas mezi všemi 3 = consensus (proceed). Neshoda = signal že to
chce hlubší investigaci.
