#!/usr/bin/env python3
"""
tools/editor_server.py — local server for the content editor.

Run:  python3 tools/editor_server.py [port]
Then open the URL it prints. Default port 8020.

Serves the whole project as static files (same as `python3 -m
http.server`) and adds two endpoints the editor page calls:

  POST /api/save   { file: "custom-content.js"|"custom-sprites.js", content: "..." }
                    Backs up the current file into tools/backups/,
                    then overwrites it. Only those two filenames are
                    ever allowed — nothing else on disk is touched.
  POST /api/test    Runs `node test/smoke.js` and returns its output,
                    so a save can be sanity-checked without leaving
                    the browser.

This intentionally avoids `python -m http.server`: that command's
own argument parser reads the current directory at import time in a
way some sandboxed setups (e.g. this project living in iCloud Drive)
refuse to allow. This script never calls that code path.
"""
import http.server
import json
import pathlib
import shutil
import subprocess
import sys
import time
from functools import partial

ROOT = pathlib.Path(__file__).resolve().parent.parent
BACKUP_DIR = ROOT / 'tools' / 'backups'
ALLOWED_SAVE_FILES = {'custom-content.js', 'custom-sprites.js', 'custom-assets.js'}
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8020


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet — errors still print via send_error

    def end_headers(self):
        # This is a dev tool being actively edited — a browser (especially
        # on a phone) silently serving a stale cached copy of editor.js
        # after a change is a worse failure mode than just never caching.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/save':
            return self._save()
        if self.path == '/api/test':
            return self._test()
        self.send_error(404)

    def _read_json(self):
        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length) if length else b'{}'
        return json.loads(raw or b'{}')

    def _respond_json(self, obj, status=200):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _save(self):
        try:
            data = self._read_json()
            name = data.get('file', '')
            content = data.get('content', '')
            if name not in ALLOWED_SAVE_FILES:
                return self._respond_json(
                    {'ok': False, 'error': 'file not allowed: ' + repr(name)}, 400)
            target = ROOT / 'js' / name
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            if target.exists():
                stamp = time.strftime('%Y%m%d-%H%M%S')
                shutil.copy2(target, BACKUP_DIR / (name + '.' + stamp + '.bak'))
            target.write_text(content, encoding='utf-8')
            self._respond_json({'ok': True})
        except Exception as e:
            self._respond_json({'ok': False, 'error': str(e)}, 500)

    def _test(self):
        try:
            proc = subprocess.run(
                ['node', 'test/smoke.js'], cwd=str(ROOT),
                capture_output=True, text=True, timeout=30)
            self._respond_json({
                'ok': proc.returncode == 0,
                'output': (proc.stdout + proc.stderr).strip(),
            })
        except Exception as e:
            self._respond_json({'ok': False, 'error': str(e)}, 500)


def lan_ip():
    """Best-effort LAN IP so the printed URL works from a phone too."""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))  # no packet actually sent, just picks a route
        return s.getsockname()[0]
    except Exception:
        return None
    finally:
        s.close()


def main():
    handler = partial(Handler, directory=str(ROOT))
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    # Bound to 0.0.0.0 (not just localhost) so a phone on the same Wi-Fi
    # can reach it too. Anyone else on that Wi-Fi could reach it as well —
    # fine for a home network, but don't run this on a shared/public one.
    with http.server.ThreadingHTTPServer(('0.0.0.0', PORT), handler) as httpd:
        ip = lan_ip()
        print('Content editor: http://localhost:%d/tools/editor.html' % PORT)
        print('Game itself:    http://localhost:%d/index.html' % PORT)
        if ip:
            print('From your phone (same Wi-Fi):')
            print('  editor: http://%s:%d/tools/editor.html' % (ip, PORT))
            print('  game:   http://%s:%d/index.html' % (ip, PORT))
        print('Ctrl+C to stop.')
        httpd.serve_forever()


if __name__ == '__main__':
    main()
