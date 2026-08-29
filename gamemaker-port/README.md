# Aerendell — GameMaker port

Port of the Field/Farming loop into `~/GameMakerProjects/Incremental RPG`.
**This folder is reference only** — the `.gml` files here are text to copy
into the IDE, not real GameMaker resources. Nothing here is wired into the
actual project automatically; that's deliberate, explained in the main
conversation: I can't open GameMaker Studio and verify a build myself, so I'm
not hand-authoring the project's `.yy`/`.yyp` resource files — one malformed
field there can silently break the whole project. You create the resource in
the IDE (which always writes a correct file), and paste in code I've written
and can vouch for.

## What this covers

Just the Field: six plots, plant → water → harvest, the two crops (Red
Berries 120s, Flax 240s), Farming XP and levels with the growth-speed bonus,
save/load to a JSON file. Everything else (Foraging, Crafting, Inventory, the
hub, the dock) is deliberately not touched yet — this is the checkpoint batch,
per the plan: get one system running for real, confirm it, then continue.

Nothing here has real art. Every element is a rectangle or the IDE's default
font, on purpose — the design brief calls for function over aesthetics in v1,
and it means the same thing here it did in the browser build: swapping in
real sprites later only touches the Draw event, nothing else.

## Setup (5–10 minutes)

1. Open `Incremental RPG` in GameMaker.
2. Right-click **Objects** in the Asset Browser → **Create Object**.
   Name it exactly `obj_field`.
3. In the object editor, add three events (the **Add Event** button):
   - **Create**
   - **Step** → **Step** (the plain one, not Begin/End)
   - **Draw** → **Draw GUI**
4. Open each event and paste in the matching file from this folder:
   - `Create_0.gml` → the Create event
   - `Step_0.gml` → the Step event
   - `Draw_64.gml` → the Draw GUI event
5. Open **Room1**. Drag `obj_field` from the Asset Browser into the room
   canvas once, anywhere — its position doesn't matter, everything draws
   relative to the screen (GUI layer), not room coordinates.
6. **Recommended:** Room1's default size is 1366×768 (landscape). The design
   brief is portrait, one-handed. In Room1's Room Settings, try something
   like 720×1280. The layout code reads the GUI size live, so it should
   adapt — this is the first real thing worth checking when you run it.
7. Run the game (F5 or the green Run button).

## What to check

- Tap **Seeds** → a two-row picker (Red Berries, Flax) should replace the
  plot grid. Tap one → it closes and Seeds shows as held (green).
- Tap an empty plot → it should say "sown" and show the crop name.
- Tap **Watering Can**, then the sown plot → a thin progress bar should
  start filling along the plot's bottom edge, and Farming XP should tick
  up by 2.
- Wait out the timer (Red Berries is 120s — long for a first test; feel
  free to temporarily change `seconds: 120` to something like `5` in
  `Create_0.gml` just to confirm the ripe → harvest path quickly, then put
  it back).
- Tap **Scythe** on a ripe plot → it should harvest, XP should jump by 26
  (Red Berries) or 50 (Flax), and the plot should go back to empty.
- **Close and reopen the game.** A planted, still-growing plot should still
  be mid-grow (not reset) — that's the save/load and the deadline-timer
  logic both working.

## Known simplifications versus the browser build

- The circular growth ring became a straight progress bar — simpler to draw
  reliably without live-testing arcs.
- The seed sheet is inline (replaces the plot grid) rather than a proper
  bottom-sheet overlay with a backdrop.
- No sprites, no animation, no juice (particles, flashes) yet — the JS
  build's `flash()`/ripple/reap-leap animations aren't ported. Add them once
  the mechanics are confirmed working, not before.

## Report back

Whatever breaks or looks wrong, tell me what you did and what happened — I'll
fix the `.gml` here and you re-paste the corrected version. Once Field is
confirmed solid, next up is Foraging, following the same pattern.
