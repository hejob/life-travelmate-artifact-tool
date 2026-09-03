# TravelMate — working notes for Claude

Trip companion app ("Sankara Days") for a 2-person family trip, Sep 3–11, 2026:
Naha → Fukuoka → Yakushima (sankara hotel&spa) → Fukuoka → Naha. See README.md and PROMPT-INIT.md.

## Published artifacts (do not create new ones — always update these URLs)

- Full (capabilities db + sample, account-internal): https://claude.ai/code/artifact/52b50ec3-13d1-4b18-bf75-b0bb194602f2
- Lite (no capabilities, publicly shared): https://claude.ai/code/artifact/da231446-0040-4a53-82b2-c458357e6929

## Update workflow — ALWAYS keep both artifacts in lockstep

1. Edit `app/sankara-days.html` ONLY. Never hand-edit `app/sankara-days-lite.html` (generated).
2. Run `scripts/build-lite.sh` (flips the `const LITE=false;` flag, retitles to "Sankara Days Lite").
3. Republish both files to their artifact URLs above (pass the URL as `url`; capabilities are stored per artifact and carry forward — never re-declare them, and never add db/sample to Lite: any Claude capability blocks public sharing).
4. `git commit` and `git push` (remote: git@github.com:hejob/life-travelmate-artifact-tool.git).

Publish warnings on Lite about `use("db")`/`use("sample")` being undeclared are expected — that code is LITE-guarded fallback; ignore them.

## App conventions

- Single self-contained HTML file, vanilla JS, no build step besides the Lite copy.
- Maps are schematic inline SVGs projected from real lat/lng (external map tiles are CSP-blocked in artifacts). Places live in `PL`, land polygons in `YAKU`/`FUK_LAND`/etc.; markers link to Google Maps.
- All times are JST (`Asia/Tokyo` via Intl); itinerary data is the `DAYS` array (built-in) with per-day overrides in `plan[iso]`; ideas in `IDEAS` (with `ll` coords); shared state via db doc `trip/shared` (checks) + collection `notes`, with localStorage fallback.
- English + Japanese place names everywhere; keep both when adding content.
- Facts marked "confirm" in the plan (flight times) are user-provided estimates; verify transport/hours claims via web search before hardcoding them (as done for the Hilton Sea Hawk shuttle).

## Data bundles

Every export is the same shape, so any file can go into any Import box and only
the parts it carries are touched:
`{app, version, exported, days?, notes?, checks?, bookings?}`. v1 files (days
only) still load. Import always asks **merge** (matching ids updated, nothing
removed) or **replace** (that part swapped outright) — the only difference is
what happens to items the file does not mention. Notes live in a collection, not
the shared doc, so `notesApply` upserts per note and, on replace, deletes the
ones the file omits.

Sharing is Copy plus `navigator.share` when the frame is allowed it (feature
detected, falls back to Copy). A real file download would need the `downloads`
capability declared — not enabled, since re-declaring capabilities on the Full
artifact risks its `db`/`sample` grants mid-trip.

## Mobile checks before publishing

UI changes must be verified with the Playwright harness in `scripts/test/`
(see its README). `app/sankara-days.html` has no `<meta viewport>` of its own —
the artifact wrapper injects one at publish time — so run
`node scripts/test/preview.js` first or every mobile measurement is taken at a
980px layout and is meaningless.

Guardrails the audit enforces: 44x44 CSS px hit targets (compact chips may keep
a smaller painted box if an `::after` overlay carries the target), 16px minimum
font on every form control (below that iOS Safari zooms on focus), and WCAG
1.4.3 contrast in both light and dark. Text on an accent fill uses
`--on-accent`, which flips to a dark ink in dark mode — white fails there.

## Schedule editing

The day is a timeline, so items are **always** kept in time order — there is no
manual arrangement. `sortEvents` runs on every read (`effDay`) and every write
(add, save, delete, import), so data written by an older build is ordered too.
Items whose time is a word rather than a clock reading sort at the hour that
word means (`TIME_WORDS`); anything unrecognised inherits the preceding item's
slot so it stays where it was rather than jumping to the top.

The artifact frame does not scroll itself — the page around it does — so
`scrollIntoView` inside the app is a no-op in the viewer. Anything that has to
be seen must be *rendered* where the user is looking. A new item has no time
yet, so it sorts to the end of the day; its form therefore opens at the top of
the list next to "+ Add item" (`newEv`), and the item drops into its slot on
save. Cancelling, switching day or leaving edit mode discards the empty stub.

**Snapshots from `db` are frozen, and an unchanged document comes back as the
same object every delivery.** Assigning one into state the app later mutates
(`checks`, `bookings`, `plan`) throws "object is not extensible" under
`"use strict"`, which aborts the handler that touched it — a tick, a save or
"+ Add item" then does nothing at all, with no visible error. Everything read
out of the store goes through `thawed()` first. Lite has no `db`, so this class
of bug is invisible there: test it with `scripts/test/frozen.js`.

`shareWrite` must never throw and must never gate the UI. `sharedRef.set()`
can fail *synchronously* — a backend that dislikes the document shape throws
rather than rejecting — and an escaping exception abandons the rest of the
caller, which is what made "+ Add item" look dead in the Full build while Lite
(no `db`) was fine. Render first, persist after; write the device copy
unconditionally; report a refused write in the sync label instead of showing
"synced". The schedule is stored as `planJson` (a string) so the document stays
a flat map of scalars; `plan` is still read for documents written earlier.

A write to `trip/shared` comes back as a snapshot, and that echo can still carry
the pre-write document. Applying it blindly wipes the edit that was just made —
this is what made "+ Add item" look dead. `planHoldsLocal()` keeps local
schedule state authoritative while a form is open and for `PLAN_SETTLE` after a
write; `scripts/test/sync.js` reproduces the failure against a deliberately
laggy fake db.
