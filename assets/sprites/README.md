# Sprites

## NES replacement direction

The installed NES replacement batches currently include:

- `items/stone.png`
- `items/stone-block.png`
- `items/basalt.png`
- `items/basalt-block.png`
- `items/coal.png`
- `items/pine-planks.png`
- `items/birch-logs.png`
- `items/birch-planks.png`
- `items/red-berries.png`
- `items/flint-axe.png`
- `items/wooden-axe.png`
- `items/stone-axe.png`
- `items/wooden-pickaxe.png`
- `items/flint-pickaxe.png`
- `items/stone-pickaxe.png`
- `items/scrap-pickaxe.png`
- `trees/pine/0.png` and `trees/pine/1.png`
- `trees/birch/0.png` and `trees/birch/1.png`
- `mining/zones/stone.png`, `copper.png`, `iron.png`, `gold.png`, and
  `diamond.png`
- `mining/surface.png`
- all 17 skill icons in `skills/<skillId>.png`
- `dock/home.png`, `dock/explore.png`, `dock/inventory.png`,
  `dock/skills.png`, and `dock/map.png`
- `craft/flintAxe.png` (the same Flint Axe art reused for its recipe)
- `craft/stoneAxe.png` (the same Stone Axe art reused for its recipe)
- `craft/flintPickaxe.png`, `craft/stonePickaxe.png`, and
  `craft/scrapPickaxe.png` (their item art reused for the recipes)

New replacements should match this shared brief: a centered object designed on
a roughly 24×24 logical pixel grid, hard square pixel clusters, a strong dark
silhouette, no antialiasing, and no more than four or five object colors. Keep
generous transparent padding. Do not add rounded-square badges, frames, text,
external shadows, glow, gradients, or scenery behind inventory objects.

Use a consistent three-quarter view for resources and a lower-left to
upper-right diagonal for handheld tools. The existing Pine Logs sprite already
fits the intended direction and remains the reference for wood resources.

Drop image files in at these exact paths and the game uses them automatically
— no code changes and no rebuild. Any missing asset continues to use its
built-in vector placeholder art.

    soil/tilled.png            the plot background, shared by all six plots

    tools/seeds.png            the three tool icons
    tools/fertilizer.png
    tools/water.png

    crops/<cropId>/<n>.png     one growth frame per stage of a crop
                                n runs 0..waters -- n == waters is the ripe
                                frame. Both current crops are single-stage
                                (waters: 1), so each needs just 0.png and
                                1.png -- crops/redBerries/ and crops/flax/.

    trees/<treeId>/<n>.png     same idea, for Logging -- trees/pine/0.png
                                and trees/pine/1.png

    forage/<itemId>.png        one icon per gatherable -- berries.png,
                                flint.png, sticks.png, flax.png

    craft/<recipeId>.png       one icon per recipe pill -- flintAxe.png,
                                flintPick.png

    mining/zones/<slug>.png    the Mining screen's big art banner, one per
                                depth zone in `MINE_ZONES` (src/data.js) --
                                stone.png, copper.png, iron.png, gold.png,
                                diamond.png. Renders wide (object-fit:
                                cover, not contain -- see mining.js's
                                drawMineArt()), so a landscape/portrait
                                scene crops rather than letterboxes here,
                                unlike every other sprite on this page.

    items/<slug>.png           one icon per bag item, for the Inventory
                                screen. slug is the item's name, lowercased
                                and dashed -- "Red Berries Seeds" becomes
                                red-berries-seeds.png, "Flint Axe" becomes
                                flint-axe.png. Independent of the crop/forage/
                                craft sprites above: the Inventory card
                                doesn't care how you got the item, just what
                                it is.

    skills/<skillId>.png       one icon for every entry in SKILLS

    dock/<screenId>.png        Home, Explore, Bag, Skills, and Map icons in
                                the persistent bottom navigation bar

Crop ids and watering counts live in `CROPS` in `src/data.js`. Tree ids live
in `TREES`, right below it -- same shape as `CROPS`, since Logging is
Farming's mirror end to end. Gatherable ids live in `FORAGEABLES`. Flax
appears in both crops and gatherables -- it's the same "Flax" bag item
either way, just two different ways to get it. Recipe ids and costs live in
`RECIPES` -- a craft spends its cost from the bag the moment it starts, the
same instant Field spends a seed. Every bag item that can ever exist is a key
in `TINTS`, which is also the canonical list `items/` sprites are checked
against and the order the Inventory screen displays them in.

## Rules

- **Square art scales best.** Images are fit with `object-fit: contain`, so a
  non-square file just letterboxes rather than stretching.
- **Files are checked once, at startup.** Add or replace one, then reload the
  page — no need to touch any code.
- **A crop's frames are independent.** You can ship a real ripe-stage sprite
  for one crop while it still falls back to the vector sprout for another;
  each frame is looked up on its own.
- **Missing is not broken.** If a file isn't here, that piece quietly keeps
  using the placeholder art. The game never shows a broken-image icon.
