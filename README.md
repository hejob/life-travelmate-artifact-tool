# TravelMate — Sankara Days

Support tool for the Sep 3–11, 2026 family trip: Naha → Fukuoka → Yakushima (sankara hotel&spa) → Fukuoka → Naha.

## Structure

- `app/sankara-days.html` — the trip companion app (single self-contained HTML page). Published as a Claude Artifact.
- `docs/Yakushima 5-Day Sankara Itinerary.xlsx` — original itinerary spreadsheet (source of the Yakushima days).
- `PROMPT-INIT.md` — original goals / trip notes.

## The app

Two published artifacts from the same source file:

- **Full (synced)**: https://claude.ai/code/artifact/52b50ec3-13d1-4b18-bf75-b0bb194602f2 — capabilities `db` + `sample`. Notes/checks sync between devices, but the `db` capability makes it org-internal: it only opens for viewers signed into the owner's Claude account/org (sign in with the same account on the second phone).
- **Lite (shareable)**: https://claude.ai/code/artifact/da231446-0040-4a53-82b2-c458357e6929 — capability `sample` only, so it can be shared with anyone from the page's share menu. Notes/checks stay per-device; Ask works for signed-in viewers. Published from a copy with the title changed to "Sankara Days Lite".

- **Plan** — day-by-day timeline (JST-aware "Now" card), schematic route maps per day, Google Maps links, done-ticks synced between phones.
- **Ideas** — curated spots per area (Yakushima/Fukuoka/Naha) with tag filters, plotted on maps.
- **Ask** — built-in Claude chat that knows the itinerary; per-day recommendation buttons.
- **Notes** — shared, taggable (todo/buy/idea/later/other day/memo), editable, checkable; checked notes hidden by default.
- **Info** — whole-trip map, hotels, flights/car summary, shared checklist, weather/typhoon links, print view for offline backup.

Uses Artifact runtime capabilities `db` (shared state between the two travelers) and `sample` (Ask Claude). Falls back to device-local storage when unavailable.

## Updating

Edit `app/sankara-days.html`, then republish it with the Full artifact URL as `url`. For the Lite artifact: copy the file, change `<title>` to "Sankara Days Lite" (and the sync label to "this device"), and republish the copy with the Lite URL as `url` and capabilities `{sample: {}}`.
