# Task Files — How to Use

Each file in this directory is a self-contained work order for a single Claude Code session. Tasks build on each other in order. Complete and verify each task before starting the next.

## How to execute a task

1. Open a **new** Claude Code session in the `cat-finder/` project directory
2. Say: `Read tasks/01-supabase-schema.md and execute it`
3. The agent reads the task, does the work, and runs the verification steps
4. Confirm all acceptance criteria are ticked before closing the session
5. Open a new session for the next task

**Never carry tasks over between sessions.** Each session should start fresh with only the task file as its brief. This prevents context window issues.

## Dependency chain

```
Task 01 (schema + seed)
  └── Task 02 (Next.js scaffold)
        └── Task 03 (swipe card UI)
              └── Task 04 (swipe decisions)
                    └── Task 05 (liked list)
                          └── Task 06 (deploy to Vercel)  ← show sister here

Task 01 (schema)
  └── Task 07 (Claude enrichment module)  ← can run in parallel with Tasks 02-06
        └── Task 08 (Pets4Homes scraper)
              └── Task 09 (Gumtree scraper)
                    └── Task 10 (pipeline script)
                          └── Task 11 (GitHub Actions cron)
```

Tasks 02–06 and Tasks 07–09 can run in parallel if you have two developers. Otherwise run them in order.

## Task list

| Task | Phase | Description | Produces |
|---|---|---|---|
| 01 | 1 | Supabase schema + seed data | Database ready, fake cats to display |
| 02 | 1 | Next.js scaffold + PWA config | App loads in browser |
| 03 | 1 | Swipe card UI | Fake cats appear as swipeable cards |
| 04 | 1 | Swipe decisions | Left/right persisted, cat disappears from queue |
| 05 | 1 | Liked list page | `/liked` shows right-swiped cats |
| 06 | 1 | Deploy to Vercel | Live URL on real phone |
| 07 | 2 | Claude enrichment module | Standalone scorer, testable in isolation |
| 08 | 2 | Pets4Homes scraper | Real listings from Pets4Homes |
| 09 | 2 | Gumtree scraper | Real listings from Gumtree |
| 10 | 2 | Pipeline script | End-to-end: scrape → enrich → insert |
| 11 | 2 | GitHub Actions cron | Pipeline runs automatically every 4 hours |

## Reference documents

- `PRD.md` — what to build and why (product source of truth)
- `ARCHITECTURE.md` — technical reference: schema, env vars, API shapes, scoring weights
