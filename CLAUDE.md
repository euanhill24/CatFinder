# CLAUDE.md

Guidance for Claude Code when working in this repository.

@AGENTS.md

## Project

"Kitty Tinder" v2: a mobile-first swipe app for browsing ragdoll cat listings, for one user. This branch is a clean-slate rebuild. v1 code is gone from this branch and must not be restored or copied from history.

- `PRD-v2.md` is the product source of truth. Requirement IDs (`R-xx`, `N-xx`) come from it.
- `PLAN-v2.md` is the delivery plan and milestone list. Update its progress table when a milestone lands.
- `DESIGN.md` is the visual reference.

## Commands

All from the repo root:

```bash
npm run dev        # dev server at http://localhost:3000
npm run lint
npm run typecheck  # generates route types, then tsc
npm test           # vitest, no network or keys needed
npm run build
npm run check      # all of the above, same as CI
```

## Layout

```
src/app/        screens and routes
src/server/     the only code that touches the database
src/core/       shared rules and types used by app and collector
src/collector/  listing collection and scoring (runs on a schedule)
db/migrations/  schema as versioned SQL
fixtures/       saved pages and sample listings for tests
tests/
```

## Conventions

- **One definition per rule.** Score weights, the kitten age cut-off and the stale window live in `src/core/` and nowhere else (R-22, R-33, R-61).
- **Server-side data access only.** The browser never holds a database key. Reads and writes go through `src/server/` (N-07).
- **One env file.** `.env.local` at the repo root, template in `.env.example`. Read configuration through `src/core/config.ts`, which throws `ConfigError` naming what is missing (N-09).
- **Fail loudly.** A read that fails must render an error with the real reason, never an empty state (R-80).
- **No AI wording in the interface.** Scores are presented as facts about the cat (R-23).
- **Tests run offline.** Parsers are tested against saved pages in `fixtures/` (N-10).
- **Path alias:** `@/*` maps to `src/*`.
