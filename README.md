# CatFinder

A swipe app for finding a ragdoll cat. It collects UK rehoming listings, scores each one against what the user is looking for, and serves them best match first: swipe right to save, left to dismiss.

This branch is **v2**, a rebuild in progress. See [`PRD-v2.md`](PRD-v2.md) for what it must do and [`PLAN-v2.md`](PLAN-v2.md) for the milestones and current progress.

## Running locally

Requires Node 22 or later.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

`npm run check` runs lint, type checks, tests and a production build, the same as CI.
