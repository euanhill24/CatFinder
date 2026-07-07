# CatFinder

A Tinder‑style app for finding a cat to adopt. It scrapes UK rehoming listings, uses AI to read and score each one against what I'm looking for, and serves them up as a swipe‑through deck — swipe right on the cats you like, best matches first.

## How it works

CatFinder has two halves:

1. **A data pipeline** (`pipeline/`, `api/`) — on a schedule it scrapes cat listings from Pets4Homes and Gumtree, then uses the Claude API to pull out clean details (age, breed, location, temperament) and score each cat against my preferences. Results are saved to Supabase.
2. **A swipe UI** (`temp-next-app/`) — a Next.js web app that shows the highest‑scored cats first as a card stack you can swipe through, tap for detail, and shortlist.

The scrape‑and‑score step runs automatically every few hours via GitHub Actions, so the deck stays fresh.

## Built with

- **Pipeline:** Node.js · Cheerio (scraping) · the Claude API (`@anthropic-ai/sdk`) for enrichment & scoring · Supabase
- **Web app:** Next.js · React · TypeScript · Tailwind CSS · react‑tinder‑card
- **Automation:** GitHub Actions (scheduled scrape) · deployed on Vercel

## Running locally

The scraping/scoring pipeline is at the repo root; the web app is in [`temp-next-app/`](temp-next-app/). Copy `.env.example` and add your Supabase and Anthropic API keys. The full design is written up in [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`PRD.md`](PRD.md).
