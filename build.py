#!/usr/bin/env python3
"""
build.py — bundle the multi-file project into ONE portable index-single.html

Run:  python3 build.py
Keeps the modular source as the thing you edit; the bundle is just output.
"""
import re, pathlib, sys

SRC = pathlib.Path(__file__).parent
OUT = SRC / 'leatheron-single.html'

html = (SRC / 'index.html').read_text(encoding='utf-8')

# --- inline the stylesheet ---
css = (SRC / 'css/style.css').read_text(encoding='utf-8')
html = re.sub(
    r'<link rel="stylesheet" href="css/style\.css">',
    '<style>\n' + css + '\n</style>',
    html, count=1)

# --- inline scripts in their original order ---
script_tags = re.findall(r'<script src="([^"]+)"></script>', html)
if not script_tags:
    sys.exit('no local script tags found')

bundle_parts = []
for rel in script_tags:
    p = SRC / rel
    bundle_parts.append('/* ===== ' + rel + ' ===== */\n' + p.read_text(encoding='utf-8'))

bundle = '<script>\n' + '\n\n'.join(bundle_parts) + '\n</script>'

# replace the whole run of script tags with the single bundle
html = re.sub(
    r'<!-- Load order matters.*?</script>\s*(?=</body>)',
    bundle + '\n',
    html, flags=re.S)

# --- storage fallback so the file works even where localStorage is blocked ---
shim = """<script>
/* Storage shim: some browsers block localStorage on file:// URLs.
   Fall back to an in-memory store so the game still runs (progress
   just won't survive a reload). */
(function () {
  var ok = false;
  try { window.localStorage.setItem('__t', '1');
        window.localStorage.removeItem('__t'); ok = true; } catch (e) {}
  if (!ok) {
    var mem = {};
    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: function (k) { return k in mem ? mem[k] : null; },
          setItem: function (k, v) { mem[k] = String(v); },
          removeItem: function (k) { delete mem[k]; },
        },
      });
    } catch (e) {}
    window.__memoryStorage = true;
  }
})();
</script>
"""
html = html.replace('<script>\n/* ===== js/data.js', shim + '<script>\n/* ===== js/data.js', 1)

OUT.write_text(html, encoding='utf-8')
print('wrote', OUT.name, '-', len(html), 'bytes,', len(script_tags), 'scripts inlined')
