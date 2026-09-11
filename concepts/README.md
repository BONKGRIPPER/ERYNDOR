# NES home concept

Open `http://localhost:5500/concepts/nes-home.html` while `node serve.js` is
running from the game folder.

This is intentionally isolated from the live game. It keeps the current home
screen's content and mobile width, but proves the NES visual direction without
changing saves, navigation, or production styles.

The Farm, Forest, Shaft, and Craft Bench cards now open complete area concepts.
Each has unique generated scene art, matching skill/status panels, and sample
actions based on the live game's existing mechanics. Escape or the back button
returns to Aerendell. Direct preview hashes also work: `#farm`, `#forest`,
`#mine`, and `#craft`.

## Production integration map

- Move the NES custom properties and component rules into a late section of
  `style.css`, scoped below a body class such as `.theme-nes`.
- Reuse `assets/aerendell-nes-hero.png` in the live `.hero` or a new home-only
  `.world-card` element.
- In `src/hub.js`, retain the existing `drawMenu()` data/event behavior and
  change only its emitted card markup/classes to the concept's numbered cards.
- Keep the existing forage and dock JavaScript; both concept components map to
  the current `#forage-bar` and `#dock` elements.
- The prototype is keyboard, touch, and narrow-screen friendly. It uses no
  external fonts, packages, or runtime dependencies.
