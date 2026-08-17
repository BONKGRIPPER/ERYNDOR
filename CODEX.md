# Eryndor Game — CODEX Notes

This file is the working reference for Codex when making changes in this project. It is meant to reflect the code that actually loads from `index.html`, not just older design notes.

## What this project is

- A plain browser game built with `index.html` + `css/style.css` + script-loaded JavaScript.
- No framework, bundler, or module system in normal development.
- Source of truth is the multi-file app. `leatheron-single.html` is generated output.

## Load order

`index.html` loads scripts in this order, and that order matters:

1. `js/data.js`
2. `js/sprites.js`
3. `js/custom-content.js`
4. `js/custom-sprites.js`
5. `js/core.js`
6. `js/engine.js`
7. `js/systems/cards.js`
8. `js/systems/craft.js`
9. `js/systems/food.js`
10. `js/systems/township.js`
11. `js/systems/farm.js`
12. `js/systems/market.js`
13. `js/systems/consumables.js`
14. `js/systems/world.js`
15. `js/ui.js`
16. `js/main.js`

Everything hangs off the global `window.Game` object (`G` inside the IIFEs).

## Structure

- `index.html`
  Markup shell and DOM ids. Tests depend on these ids being real.
- `css/style.css`
  All styling.
- `js/data.js`
  Base content and tuning: resources, skills, crops, foods, villagers, cards, locations, stations, zones, items, tune values.
- `js/custom-content.js`
  Generated overrides/additions from the editor. Do not hand-edit unless you intentionally want to bypass the editor and accept being overwritten later.
- `js/sprites.js`
  Base SVG sprite helpers/data.
- `js/custom-sprites.js`
  Generated sprite overrides from the editor.
- `js/core.js`
  Event bus, state creation, persistence, ticker registry, inventory helpers, shared derived logic.
- `js/engine.js`
  Hand/deck flow, timing window, card resolution loop, combat/play resolution.
- `js/systems/*.js`
  Domain behavior layered onto `G`:
  `cards`, `craft`, `food`, `township`, `farm`, `market`, `consumables`, `world`.
- `js/ui.js`
  Rendering and DOM output. Reads state and calls `G.*` entry points.
- `js/main.js`
  Boot wiring: event subscriptions, button handlers, page navigation, startup behavior.
- `test/*.js`
  Node-based regression suite using `test/harness.js`.
- `tools/editor.*`
  Content editor/dev kit that writes generated content into `custom-content.js` and `custom-sprites.js`.
- `build.py`
  Creates `leatheron-single.html` by inlining CSS and scripts.

## Architecture rules

- Keep content in `data.js` unless it is editor-managed content, which belongs in the generated custom files.
- Never mutate `S.weight` directly. Use `G.addRes` / `G.removeRes`.
- Never read the DOM from systems. DOM work belongs in `ui.js` and `main.js`.
- Prefer systems emitting events and `ui.js` reacting to them.
- New persisted state must be added to the `PERSIST` list in `core.js`.
- Use the shared ticker model in `core.js` instead of adding ad hoc `setInterval` loops.
- Edit source files, not `leatheron-single.html`.

## Important live design choices in the current code

- The app is a hand-of-three card flow.
- Zones have their own field/deck state.
- Combat and card play are real-time only.
- Villagers and farm growth are the main background/offline-style systems.
- Market, township, farming, donation, and collection/deck-purge systems are already integrated.
- `custom-content.js` currently overrides part of the base data, so balancing changes may come from either base content or generated content.

## Safe workflow for changes

1. Read `index.html` if a change touches the UI or adds/removes ids.
2. Read the relevant system file and `ui.js` together for feature work.
3. Check whether the changed content is base data or editor-generated data.
4. After edits, run focused tests first, then at least `test/smoke.js`.

## Useful commands

Run from the project root:

```sh
node test/smoke.js
node test/balance.js
python3 build.py
python3 -m http.server
```

## Testing notes

- `test/harness.js` intentionally returns `null` for unknown DOM ids to catch bad references.
- `smoke.js` is especially valuable because it catches boot issues, stale DOM ids, and duplicate definitions.
- There are many focused regression tests for gameplay systems. Prefer running the ones closest to the area being changed.

## Guidance for future Codex edits

- Favor small, local changes over rewrites.
- Preserve the existing plain-JS architecture unless the task explicitly calls for structural migration.
- If a behavior can be expressed as content plus a small system hook, prefer that over growing `engine.js`.
- Treat `ui.js` as a candidate for future splitting, but do not split it casually unless a task clearly benefits.
