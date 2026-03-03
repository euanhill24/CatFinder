# Task 06 — Deploy to Vercel

## Context

Tasks 01–05 are complete. The app is fully working locally with fake cat data. This task deploys it to a live URL so it can be tested on a real phone. This is the end of Phase 1 — share the URL with the end user after this task.

## Prerequisites

- [ ] Tasks 01–05 complete and working locally
- [ ] `npm run build` passes without errors
- [ ] GitHub account exists
- [ ] Vercel account exists (vercel.com — free, no card needed)
- [ ] The project is in a GitHub repository (create one if not already done)

## Your job

### 1. Ensure the repo is clean

- `.env.local` is gitignored and not committed
- No hardcoded credentials anywhere in the codebase
- `npm run build` succeeds locally before pushing

### 2. Push to GitHub

If not already done, initialise a git repo, create a GitHub repository, and push all code.

### 3. Connect to Vercel

- Go to vercel.com → New Project → Import from GitHub
- Select the repository
- Framework preset: Next.js (auto-detected)
- Root directory: `/` (default)
- Do not deploy yet — add environment variables first

### 4. Add environment variables in Vercel

In the Vercel project settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

Do NOT add `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, or `FIRECRAWL_API_KEY` — those are pipeline-only and do not belong in the frontend deployment.

### 5. Deploy

Trigger the deployment. Vercel will build and deploy automatically.

### 6. Optional: Enable Vercel password protection

If you want the URL to be private (recommended — this is personal data):
- Vercel project → Settings → Password Protection
- Set a simple password to share with your sister alongside the URL

### 7. Test on a real phone

After deployment, open the live URL on an iPhone and verify:
- App loads
- Fake cats appear as swipeable cards
- Swiping works with touch gestures
- Detail modal opens on tap
- Liked list accessible
- App can be added to home screen (share → Add to Home Screen in Safari)

## Acceptance criteria

- [ ] App is live at a `*.vercel.app` URL
- [ ] No build errors in Vercel deployment logs
- [ ] Fake cats appear on the live URL
- [ ] Swipe gestures work on iPhone Safari
- [ ] Decisions are persisted (swipe a cat, refresh, it's gone)
- [ ] Liked list works on the live URL
- [ ] App can be added to iPhone home screen and opens in standalone mode
- [ ] No Supabase credentials visible in browser source or network requests (anon key is acceptable — service role key must not appear)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NOT in Vercel environment variables

## Do not

- Commit `.env.local` to the repository
- Add the service role key to Vercel
- Configure a custom domain (not needed for a personal temporary app)

## After this task

Share the Vercel URL (and password if set) with your sister. Ask her to test the swipe feel on her phone and give feedback on:
- Does swiping feel responsive?
- Is the card layout readable on her phone?
- Do the score bars make sense?

Incorporate any UX feedback before starting Phase 2.
