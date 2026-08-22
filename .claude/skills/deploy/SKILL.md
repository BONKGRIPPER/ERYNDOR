---
name: deploy
description: Push the current Leatheron source to the live GitHub Pages site (https://bonkgripper.github.io/ERYNDOR/) — runs the test suite, bumps the service worker's cache version so installed phones pick up the change, commits, and pushes. Use when the user asks to deploy, publish, push, ship, or update the live/github/itch site with recent changes.
---

# Deploy Leatheron to GitHub Pages

The live site (`https://bonkgripper.github.io/ERYNDOR/`) is served directly
from this repo's `main` branch — GitHub Pages rebuilds automatically on
every push, no separate build step. `git push` works non-interactively here
because the user's Personal Access Token is already cached in the macOS
keychain (`credential.helper=osxkeychain`) from their first manual push; if
a future push ever fails with an auth error, tell the user to run
`git push origin main` themselves once from their own Terminal to refresh
the cached credential, then retry.

## Steps

1. **Run the test suite** and skim for regressions:
   ```bash
   for f in test/*.js; do
     [ "$f" = "test/harness.js" ] && continue
     out=$(node "$f" 2>&1)
     bad=$(echo "$out" | grep -i 'false\|error' | grep -v 'expect false')
     if [ -n "$bad" ]; then echo "=== $f ==="; echo "$bad"; fi
   done
   ```
   A number of files have pre-existing, already-known failures (see
   CLAUDE.md's "Known open questions" — durability.js, duunvael.js,
   events.js, foraging.js, formermachines.js, mining.js, rebalance.js,
   riverhold.js, stilltide.js, zoneloot.js as of this writing). Only stop
   and flag something to the user if a file NOT on that list starts
   failing, or a file on the list shows a NEW failure line beyond its
   known ones — don't block a deploy on the pre-existing baseline.

2. **If this deploy changes any file the service worker precaches**
   (`index.html`, `css/style.css`, any `js/**/*.js`, `manifest.json`, or an
   icon — i.e. basically anything except docs like `CLAUDE.md` or files
   under `.claude/`), **bump the cache version in BOTH places it lives**:
   - `sw.js`: `const CACHE_NAME = 'leatheron-vN';` — increment `N`.
   - `index.html`: `navigator.serviceWorker.register('sw.js?v=N', ...)` —
     increment the same `N` here too. This one matters more than it looks:
     GitHub Pages serves `sw.js` itself with `cache-control: max-age=600`
     (confirmed via response headers), so without a fresh query string a
     client's browser cache (or GitHub's CDN) can keep answering the
     service worker's own update check with the OLD `sw.js` for up to 10
     minutes after a deploy — bumping only `CACHE_NAME` inside a file the
     browser never re-fetches accomplishes nothing. Forgetting this step
     is the most likely reason a user reports "I deployed but my phone/
     browser still isn't showing the update."
   Also add/remove entries in `sw.js`'s `PRECACHE` list if this deploy
   added, removed, or renamed a source file (check against the
   `<script src="...">` tags in `index.html`).

3. **Commit and push**:
   ```bash
   git add -A
   git commit -m "<short summary of what changed>"
   git push origin main
   ```
   Use a real summary of the actual change, not a generic message — same
   standards as any other commit in this repo.

4. **Tell the user it's live** — mention GitHub Pages takes roughly
   30–90 seconds to rebuild after a push before the new version is
   actually served, and that anyone with the PWA already installed will
   get the update automatically next time they open it (thanks to step 2),
   no reinstall needed.

## What NOT to do here

- Don't touch `leatheron-single.html`, `leatheron-itch.zip`, or run
  `build.py` — those are a completely separate distribution path (itch.io
  / AirDrop), unrelated to the GitHub Pages source-file deploy this skill
  covers. Regenerating them isn't part of this workflow unless the user
  separately asks to update the itch.io build too.
- Don't force-push, rebase, or touch history — this is always a
  fast-forward `git push` to `main`.
