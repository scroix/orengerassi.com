# Evidence for the site-a11y-weight-sharing PR

This branch holds the screenshots, reports and scripts behind the `site-a11y-weight-sharing` pull request. It is not part of the site. GitHub Pages serves only `main`, so nothing here goes live. Delete this branch after the PR is merged or closed.

## What each folder holds

- `before/` and `after/` hold full-page screenshots at 1280 and 390 px wide, collapsed and with each section open. Chrome 156 took them at device scale 1 after every animation settled. `before/` is `main` at e975ea9. `after/` is the PR head.
- `after/focus-1280.png` and `after/focus-390.png` show keyboard focus on each of the five buttons, in Tab order.
- `portrait/` compares the final drawn frame of the portrait, `main` against the rounded paths. Each crop is the worst 40 px cell, shown as old, new, and the difference times four. `final-frame.txt` has the counts and histograms.
- `preview.png` is the Open Graph image the PR ships.
- `reports/` holds the Lighthouse HTML reports (median of 5 runs, simulated throttling, served by `scripts/serve.mjs` with gzip) and the axe JSON, before and after.
- `gates/` holds the output of every check, one file per unit of the PR.
- `scripts/` holds every script used. `round-paths.mjs` and `make-preview.mjs` regenerate the shipped path data and `preview.png` byte for byte.

## Rerun the checks

1. Run `npm install` in `scripts/`.
2. Serve each side: `node serve.mjs <path-to-main-checkout> 8101` and `node serve.mjs <path-to-pr-checkout> 8102`.
3. Run a check against a URL, for example `node shoot.mjs http://localhost:8102/ out/`, then `node diff.mjs before/ out/ diff/`.

The scripts expect Google Chrome to be installed. Playwright launches it with `channel: 'chrome'`.
