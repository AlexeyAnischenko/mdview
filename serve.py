"""Local server for mdview.html.

Serves the viewer at http://127.0.0.1:<port>/ and local files at /@fs/<absolute path>, so
`mdview.html?file=C:\\docs\\notes.md` works without browser flags. Only Markdown, text and image
files are served, only to requests addressed to 127.0.0.1/localhost.

    python serve.py [file.md] [--port 8765] [--no-open]

If a server is already running on the port, this just opens the file in the browser and exits.
"""
import argparse
import http.server
import mimetypes
import pathlib
import re
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser

HERE = pathlib.Path(__file__).resolve().parent
VIEWER = HERE / "mdview.html"
PING = b"mdview"
SERVED_EXT = {
    ".md": "text/markdown", ".markdown": "text/markdown", ".mdown": "text/markdown", ".mkd": "text/markdown",
    ".mdx": "text/markdown", ".txt": "text/plain",
    ".png": None, ".jpg": None, ".jpeg": None, ".gif": None, ".svg": None, ".webp": None, ".avif": None,
    ".bmp": None, ".ico": None,
}


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "mdview"

    def do_GET(self):
        self.serve(send_body=True)

    def do_HEAD(self):
        self.serve(send_body=False)

    def serve(self, send_body):
        # Reject requests for other host names (DNS rebinding from a web page).
        host = self.headers.get("Host", "").rsplit(":", 1)[0]
        if host not in ("127.0.0.1", "localhost"):
            return self.send_error(403)

        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if path in ("/", "/mdview.html"):
            file, ctype = VIEWER, "text/html; charset=utf-8"
        elif path == "/@ping":
            return self.reply(PING, "text/plain", send_body)
        elif path.startswith("/@fs/"):
            p = path[len("/@fs"):]
            if re.match(r"^/[A-Za-z]:/", p):
                p = p[1:]  # /C:/x -> C:/x
            file = pathlib.Path(p)
            ext = file.suffix.lower()
            if not file.is_absolute() or ext not in SERVED_EXT:
                return self.send_error(403, "Only Markdown, text and image files are served")
            ctype = SERVED_EXT[ext] or mimetypes.guess_type(file.name)[0] or "application/octet-stream"
            if ctype.startswith("text/"):
                ctype += "; charset=utf-8"
        else:
            return self.send_error(404)

        try:
            data = file.read_bytes()
        except OSError:
            return self.send_error(404, f"Not found: {file}")
        self.reply(data, ctype, send_body)

    def reply(self, data, ctype, send_body):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if send_body:
            self.wfile.write(data)

    def log_message(self, fmt, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    # On Windows SO_REUSEADDR lets a second server bind a port that is already in use.
    allow_reuse_address = False
    daemon_threads = True


def already_running(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/@ping", timeout=1) as r:
            return r.read() == PING
    except OSError:
        return False


def main():
    ap = argparse.ArgumentParser(description="Serve mdview.html and open a Markdown file in it.")
    ap.add_argument("file", nargs="?", help="Markdown file to open")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-open", action="store_true", help="don't open a browser")
    args = ap.parse_args()

    url = f"http://127.0.0.1:{args.port}/"
    if args.file:
        url += "?file=" + urllib.parse.quote(str(pathlib.Path(args.file).resolve()), safe=":/\\")

    if already_running(args.port):
        if not args.no_open:
            webbrowser.open(url)
        return
    try:
        server = Server(("127.0.0.1", args.port), Handler)
    except OSError as e:
        sys.exit(f"Port {args.port} is in use by another program ({e}). Try --port.")

    print(f"mdview serving on http://127.0.0.1:{args.port}/  (Ctrl+C to stop)")
    if not args.no_open:
        threading.Timer(0.3, webbrowser.open, [url]).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
