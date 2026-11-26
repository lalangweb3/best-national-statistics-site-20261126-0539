# NusaStat — Portal Statistik Indonesia

**Indonesia dalam angka, 2019–2024.** A national statistics site for Indonesia: population, economy, employment, poverty, education and health — with real figures, interactive charts and working tools. Runs offline from static files, on desktop and on phone.

Entry for the make.fun competition **"Make the best national statistics site"** (`best-national-statistics-site-20261126-0539`).

## What is inside

- `app/` — the site itself (static files, no build step, no network requests):
  - `index.html` — pages and sections for every topic, all reachable by link
  - `app.js` — charts (Canvas/SVG, no external libraries), year filters, calculators
  - `style.css` — original design, responsive for desktop and mobile
- `screenshots/` — 4 real renders of the site's own code (desktop + phone)
- `main.ts` — the entrypoint: copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts`
- `vendor/makefun-frontend.ts` — the kit's copy, unchanged

## Run it

Serve `app/` with any static HTTP server, or run the entrypoint:

```sh
node main.ts            # writes the site + dossier.json to /output
MAKEFUN_OUTPUT_DIR=./out node main.ts
```

Then open `app/index.html` in a browser. No network needed.

## Data

Figures cover Indonesia 2019–2024 (population, GDP, inflation, trade, employment, poverty, education, health). All figures are consistent across pages.

## License

MIT — see [LICENSE](LICENSE).
