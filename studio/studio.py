#!/usr/bin/env python3
"""Nepali Studio in the browser - the same editor as the ISO's desktop, for your Mac.

    ./dev.sh studio            (builds, sets up the AI model, opens your browser)

Why a browser: a terminal draws Devanagari on a fixed cell grid, which breaks vowel
signs (dotted circles); a browser lays the text out properly, and copy/paste just works.

Security: it runs the code you type (with your user's rights, same as `nepali file.nep`),
so it listens on 127.0.0.1 only, insists on a per-user secret token, and rejects requests
whose Host header is not localhost (DNS-rebinding). Python standard library only.
"""
import argparse
import glob
import json
import os
import secrets
import subprocess
import sys
import tempfile
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


class Config:
    nepali = None
    examples = os.path.join(ROOT, "examples")
    token = ""
    port = 8765
    workdir = tempfile.mkdtemp(prefix="nepali-studio-")


def run_nepali(args, timeout, cwd=None):
    try:
        r = subprocess.run([Config.nepali, "--mode", "sandbox"] + args, capture_output=True, text=True, encoding="utf-8",
                           timeout=timeout, cwd=cwd or Config.workdir,
                           env={**os.environ, "NEPALI_SCRIPT": "devanagari", "NEPALI_DIGITS": "devanagari"})
        return {"stdout": r.stdout, "stderr": r.stderr, "rc": r.returncode}
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": f"समय सकियो ({timeout} सेकेन्ड)", "rc": 124}
    except OSError as e:
        return {"stdout": "", "stderr": f"nepali चलाउन सकिएन: {e}", "rc": 127}


def example_title(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.readline().strip().lstrip("/ ").strip() or os.path.basename(path)
    except OSError:
        return os.path.basename(path)


class Handler(BaseHTTPRequestHandler):
    server_version = "NepaliStudio"

    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="application/json; charset=utf-8"):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def host_ok(self):
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("127.0.0.1", "localhost")

    def authed(self):
        return self.headers.get("X-Token") == Config.token

    def do_GET(self):
        if not self.host_ok():
            return self.send(403, '{"error":"bad host"}')
        u = urlparse(self.path)
        if u.path == "/":
            with open(os.path.join(HERE, "index.html"), "rb") as f:
                return self.send(200, f.read(), "text/html; charset=utf-8")
        if u.path == "/translit.js":
            with open(os.path.join(HERE, "translit.js"), "rb") as f:
                return self.send(200, f.read(), "text/javascript; charset=utf-8")
        if not self.authed():
            return self.send(403, '{"error":"bad token"}')
        if u.path == "/api/examples":
            items = [{"name": os.path.basename(p), "title": example_title(p)}
                     for p in sorted(glob.glob(os.path.join(Config.examples, "[0-9]*.nep")))]
            return self.send(200, json.dumps(items, ensure_ascii=False))
        if u.path == "/api/example":
            name = os.path.basename(parse_qs(u.query).get("name", [""])[0])
            path = os.path.join(Config.examples, name)
            if name.endswith(".nep") and os.path.isfile(path):
                with open(path, encoding="utf-8") as f:
                    return self.send(200, json.dumps({"code": f.read()}, ensure_ascii=False))
        self.send(404, '{"error":"not found"}')

    def do_POST(self):
        if not self.host_ok():
            return self.send(403, '{"error":"bad host"}')
        if not self.authed():
            return self.send(403, '{"error":"bad token"}')
        try:
            n = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(n) or b"{}")
        except (ValueError, OSError):
            return self.send(400, '{"error":"bad request"}')
        if self.path == "/api/run":
            path = os.path.join(Config.workdir, "run.nep")
            with open(path, "w", encoding="utf-8") as f:
                f.write(body.get("code", ""))
            # Imports (`आयात`) resolve relative to the examples folder, like the examples do.
            return self.send(200, json.dumps(run_nepali([path], 120, cwd=Config.examples), ensure_ascii=False))
        if self.path == "/api/ask":
            q = str(body.get("q", "")).strip()
            if not q:
                return self.send(400, '{"error":"empty question"}')
            return self.send(200, json.dumps(run_nepali(["ask", q], 900), ensure_ascii=False))
        self.send(404, '{"error":"not found"}')


def load_token():
    """A per-user secret kept in ~/.nepali/studio-token (mode 600): other users of this
    machine cannot read it, and it survives restarts, so an already-open browser tab keeps
    working after `./dev.sh studio` is run again."""
    path = os.path.join(os.path.expanduser("~"), ".nepali", "studio-token")
    try:
        with open(path, encoding="utf-8") as f:
            tok = f.read().strip()
        if len(tok) >= 16:
            return tok
    except OSError:
        pass
    tok = secrets.token_urlsafe(16)
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(tok)
    except OSError:
        pass
    return tok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nepali", default=os.environ.get("NEPALI_BIN"))
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    if not a.nepali or not os.path.exists(a.nepali):
        sys.exit("nepali binary not found: pass --nepali or set NEPALI_BIN (./dev.sh studio does this)")
    Config.nepali, Config.port, Config.token = os.path.abspath(a.nepali), a.port, load_token()
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    url = f"http://127.0.0.1:{a.port}/#{Config.token}"
    print(f"Nepali Studio: {url}\n(Ctrl+C to stop)", flush=True)
    if not a.no_open:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
