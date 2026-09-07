# Scraper fixtures

Hand-authored HTML mirroring the structures the scrapers' selectors target.

**These were not captured from the live sites.** The sandbox this repo is
developed in cannot reach pets4homes.co.uk or gumtree.com, so they could not be
saved from a real response. That limits what they prove:

- They **do** catch us breaking our own extraction logic — a refactor that stops
  pairing attributes correctly, loses the JSON-LD path, or drops a field.
- They **do not** catch the sites changing their markup. Nothing offline can.
  The defence against that is the field-fill floors in `pipeline/run.js`, which
  fail the run when extraction quality collapses against live pages.

If you can capture real pages, replace these — save a search page and a couple
of detail pages verbatim and keep the same filenames. The assertions are written
against structure, not against exact copy, so real markup should slot in.
