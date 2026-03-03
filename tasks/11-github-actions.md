# Task 11 — GitHub Actions Cron

## Context

Task 10 is complete. The pipeline script runs successfully end-to-end when triggered manually. This task automates it by creating a GitHub Actions workflow that runs `node pipeline/run.js` every 4 hours.

## Prerequisites

- [ ] Task 10 complete and tested
- [ ] Code pushed to GitHub repository
- [ ] All required secrets added to GitHub repository settings

## Required GitHub Secrets

Before creating the workflow, these secrets must be added in GitHub:
**Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `FIRECRAWL_API_KEY` | Firecrawl API key |

Note: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not needed here — the pipeline uses the service role key.

## Your job

### 1. Create `.github/workflows/scrape.yml`

```yaml
name: Scrape cat listings

on:
  schedule:
    - cron: '0 */4 * * *'   # Every 4 hours
  workflow_dispatch:          # Allow manual trigger from GitHub UI

jobs:
  scrape:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium
        # Only needed if Firecrawl is unavailable and Playwright fallback is used

      - name: Run pipeline
        run: node pipeline/run.js
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          FIRECRAWL_API_KEY: ${{ secrets.FIRECRAWL_API_KEY }}
```

### 2. Verify the workflow file

- YAML must be valid (no syntax errors)
- All secret names match exactly what was added in GitHub settings
- The `workflow_dispatch` trigger is present so it can be triggered manually for testing

### 3. Test via manual trigger

After pushing the workflow file:
1. Go to GitHub → Actions tab → "Scrape cat listings"
2. Click "Run workflow" → "Run workflow"
3. Watch the run — it should complete successfully
4. Verify new listings appear in Supabase after the run

## Acceptance criteria

- [ ] `.github/workflows/scrape.yml` is valid YAML
- [ ] Workflow appears in the GitHub Actions tab
- [ ] Manual trigger completes successfully (green tick)
- [ ] Pipeline logs are visible in the Actions run output
- [ ] New cat listings appear in Supabase after a successful run
- [ ] Scheduled runs appear in the Actions tab at the expected times (note: GitHub may delay scheduled runs by up to 15 minutes)
- [ ] A failed run shows as red in Actions UI (error visibility)
- [ ] No secrets are printed in the run logs

## Do not

- Add Slack/email notifications for failures (not needed for a personal tool)
- Cache Playwright browsers (not worth the complexity)
- Set up matrix builds or multiple environments
- Modify the pipeline script — if the workflow fails due to a pipeline bug, fix the pipeline in a separate change

## After this task

The project is complete. Delete the fake seed data from Supabase:

```sql
DELETE FROM listings WHERE external_url LIKE '%fake%';
```

Or simply delete all rows and let the pipeline repopulate with real data on the next run.

Share the Vercel URL with your sister. Real ragdoll cats will start appearing within 4 hours.
