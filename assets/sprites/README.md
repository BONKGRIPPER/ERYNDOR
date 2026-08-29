# Sprites

Drop image files in at these exact paths and the game uses them automatically
— no code changes, no rebuild. Nothing here yet, so the game currently runs
on its built-in vector placeholder art.

    soil/tilled.png            the plot background, shared by all six plots

    tools/seeds.png            the three tool icons
    tools/water.png
    tools/scythe.png

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

    items/<slug>.png           one icon per bag item, for the Inventory
                                screen. slug is the item's name, lowercased
                                and dashed -- "Red Berries Seeds" becomes
                                red-berries-seeds.png, "Flint Axe" becomes
                                flint-axe.png. Independent of the crop/forage/
                                craft sprites above: the Inventory card
                                doesn't care how you got the item, just what
                                it is.

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
