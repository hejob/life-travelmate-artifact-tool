# Mobile checks (Playwright)

The published artifact is wrapped in a head that includes
`<meta name=viewport content="width=device-width,initial-scale=1">`.
`app/sankara-days.html` has no such head of its own, so a browser opening the
raw file lays it out at ~980px and every mobile measurement comes out wrong.
`preview.js` rebuilds that wrapper into `.preview.html` — always run it first.

    npm i playwright            # once, anywhere on the machine
    node scripts/test/preview.js
    node scripts/test/audit.js      # touch targets, contrast, fonts
    node scripts/test/flows.js      # editor CRUD, JSON import/export, time order
    node scripts/test/sync.js       # shared-doc echo must not undo a local edit
    node scripts/test/addform.js    # "+ Add item" opens its form where you tapped
    node scripts/test/dbfail.js     # a refused shared-doc write must not break the UI
    node scripts/test/frozen.js     # snapshots are frozen; state taken from them must be copied
    node scripts/test/data.js       # bundle export/import, merge vs replace, share

`CHROME_BIN` defaults to the cached Playwright Chromium; override it if your
cache lives elsewhere.

Only the Full build has `db`, so anything touching the shared document is
invisible to Lite — `sync.js` and `dbfail.js` stub `window.claude.use` to cover
that path.

## What audit.js enforces

- **44x44 CSS px** minimum hit target (Apple HIG; WCAG 2.5.5 AAA). Compact
  chips may stay visually smaller as long as an `::after` overlay carries the
  target — the audit measures that union, not the painted box.
- **16px** minimum font on every input/select/textarea, or iOS Safari zooms
  the page when the field takes focus.
- **WCAG 1.4.3** contrast, in light *and* dark, against the nearest opaque
  ancestor background.

Known exception: SVG map markers. Hit circles are sized to half the distance to
the nearest neighbour so markers can never steal each other's taps, which
leaves a few co-located ones (Anbo) small. Every marker also has a full-size
Map chip in the list under the map — WCAG 2.5.5's equivalent-control exception.
