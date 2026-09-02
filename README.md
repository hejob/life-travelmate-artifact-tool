# TravelMate — Sankara Days

Support tool for the Sep 3–11, 2026 family trip: Naha → Fukuoka → Yakushima (sankara hotel&spa) → Fukuoka → Naha.

## Structure

- `app/sankara-days.html` — the trip companion app (single self-contained HTML page). Published as a Claude Artifact.
- `docs/Yakushima 5-Day Sankara Itinerary.xlsx` — original itinerary spreadsheet (source of the Yakushima days).
- `PROMPT-INIT.md` — original goals / trip notes.

## The app

Live at: https://claude.ai/code/artifact/52b50ec3-13d1-4b18-bf75-b0bb194602f2

- **Plan** — day-by-day timeline (JST-aware "Now" card), schematic route maps per day, Google Maps links, done-ticks synced between phones.
- **Ideas** — curated spots per area (Yakushima/Fukuoka/Naha) with tag filters, plotted on maps.
- **Ask** — built-in Claude chat that knows the itinerary; per-day recommendation buttons.
- **Notes** — shared, taggable (todo/buy/idea/later/other day/memo), editable, checkable; checked notes hidden by default.
- **Info** — whole-trip map, hotels, flights/car summary, shared checklist, weather/typhoon links, print view for offline backup.

Uses Artifact runtime capabilities `db` (shared state between the two travelers) and `sample` (Ask Claude). Falls back to device-local storage when unavailable.

## Updating

Edit `app/sankara-days.html`, then republish to the same artifact URL (in Claude Code: republish the file with the artifact URL above as `url`).
