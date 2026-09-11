# Eryndor world map

Uses the user's supplied September 11 atlas image unchanged at its native
1752 × 898 resolution. Native pixels can be enlarged to 1600%; this does not
invent extra settlement detail. The artwork, travel polylines, fog, and
constant-size HTML markers share the same coordinates.

Placement source: Maps/Eryndor Pixel Atlas v1/atlas-data.js and its README,
the files from the task “Create detailed Eryndor pixel map”. Direct task
history retrieval failed, so the saved atlas provenance was used.

- Aerendell home is anchored at Aelbrook (489,722), the kingdom's settlement.
- Thal-Barak (580,559), Duun-Vael Bridge (839,738), Riverhold (970,737)
  follow the atlas coordinates.
- Forest Road (529,665) and Stilltide Pass (687,651) are inferred gameplay
  positions. Their exact locations are not established by the atlas.
- Route bends are draft terrain alignments, not new lore. Existing route
  costs, access rules, and travel mechanics are preserved.

Fog persists in mapVisited and mapExploredRoads in the existing game save.
New saves reveal Aerendell; older saves also reveal their current stop.
Completed journeys reveal all route stops and corridors, including offline
arrivals. Neighboring stops are selectable exploration leads. Multi-stop
travel still uses the existing route picker.

Coordinate and route edits belong in assets/maps/world-map-layout.js;
src/worldMap.js imports that shared layout. Future close-up
regional artwork should share these anchors before being added as detail
layers. Zoom supports wheel, pinch, buttons, World, and Locate me.

## Local map workshop

Open `Eryndor Idle/map-editor.html` in a browser (no server or installation
required). Keep it within this project so its relative artwork and script
links work. The clean, unlabelled artwork is `assets/maps/eryndor-world.png`.

- Gold markers are gameplay locations; blue markers come from the existing
  lore atlas and retain its notes/provenance. Matching lore/game locations are
  merged in the initial editor project to avoid duplicate markers. Lore routes
  are also included as planning annotations, not playable travel connections.
- Select a place from the menu, center it, then drag it or enter X/Y coordinates.
- Select a road to drag its handles. Double-click its line to insert a bend;
  right-click an interior handle to remove one. Game endpoints follow their
  connected locations, including when dragged from a road.
- Add POI and Draw road create planning annotations. Use Finish road after
  choosing at least two points. New annotations do not create gameplay nodes,
  change route costs, or unlock travel. Those need explicit integration.
- Undo retains the latest 60 changes in this editing session. Drafts autosave
  to this browser when storage is available. Export project downloads a portable
  JSON containing all locations, roads, names, and notes; send that file back for
  implementation. Import project restores an export. Always export before
  closing or switching browsers; browser storage is not a durable backup.
- Export game layout downloads `world-map-layout.js`, containing only existing
  gameplay marker coordinates and road geometry. Back up the current layout,
  then replace `assets/maps/world-map-layout.js` with this export and reload the
  game to apply those positions. Names, notes, lore markers, and new draft roads
  are kept in project JSON, not applied to gameplay by this layout export.

### Artwork replacement and future high-resolution maps

The editable coordinate space remains 1752 × 898 regardless of image resolution.
Higher-resolution artwork must preserve the same framing and aspect ratio;
replace the image at `assets/maps/eryndor-world.png` without changing the layout's
width/height. Renderers stretch the image into that shared coordinate space.
If the geography or framing changes, realign the markers/roads in the workshop.
Future regional tiles should map their bounds into this same coordinate space,
keeping artwork, labels, roads, and fog independent. Do not bake labels, roads,
or fog into the master artwork. This editor does not generate new image detail.
