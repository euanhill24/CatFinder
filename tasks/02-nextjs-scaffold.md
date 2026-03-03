# Task 02 — Next.js Scaffold + PWA Config

## Context

Task 01 is complete. The Supabase project exists with the `listings` table and 5 fake cat rows. This task creates the Next.js application shell — no UI features yet, just a working app that connects to Supabase and is configured as a PWA.

Read `ARCHITECTURE.md` for the project structure, environment variable names, and stack decisions.

## Prerequisites

- [ ] Task 01 complete
- [ ] `.env.local` created from `.env.example` with real Supabase values filled in

## Your job

### 1. Scaffold the Next.js app

Run `npx create-next-app@latest` with these options:
- TypeScript: yes
- Tailwind CSS: yes
- App Router: yes
- ESLint: yes
- `src/` directory: no (use root-level `app/`)
- Import alias: yes (`@/*`)

### 2. Install dependencies

```
npm install @supabase/supabase-js
```

### 3. Create `lib/supabase.ts`

A browser-safe Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Export a single `supabase` instance. This file is used by the frontend only — never import it in pipeline scripts.

### 4. Create `public/manifest.json`

PWA manifest so the app can be added to a phone home screen and feels native.

Required fields:
```json
{
  "name": "Kitty Tinder",
  "short_name": "Kitty Tinder",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [...]
}
```

Include placeholder icon entries (192x192 and 512x512). Actual icon images are not required at this stage — the manifest just needs to be valid.

### 5. Add PWA meta tags to `app/layout.tsx`

Add to the `<head>`:
- `<link rel="manifest" href="/manifest.json" />`
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />`

### 6. Clean up boilerplate

Remove the default Next.js homepage content from `app/page.tsx`. Replace with a placeholder: `<main><p>Loading cats...</p></main>`. The real UI is built in Task 03.

### 7. Create `.env.example`

If not already created by Task 01, ensure it exists with all 5 variable names from `ARCHITECTURE.md`.

## Acceptance criteria

- [ ] `npm run dev` starts without errors
- [ ] `http://localhost:3000` loads in browser showing "Loading cats..."
- [ ] `npm run build` completes without TypeScript errors
- [ ] `lib/supabase.ts` exports a working Supabase client
- [ ] Supabase client can be imported without throwing (test with a quick console.log of the client object)
- [ ] `public/manifest.json` is valid JSON with all required fields
- [ ] PWA meta tags present in page source
- [ ] No Tailwind configuration errors
- [ ] `.env.local` is gitignored and not committed

## Do not

- Build any cat UI (that is Task 03)
- Install swipe gesture libraries (that is Task 03)
- Create the `/liked` route (that is Task 05)
- Configure any Vercel-specific settings (that is Task 06)
