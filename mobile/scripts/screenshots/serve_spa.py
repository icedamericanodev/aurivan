"""Static server with single-page-app fallback (unknown paths → index.html).
Usage: serve_spa.py <dir> [port]  (port 8093 by default; SHOTS=cloud also serves the flag-off build on 8094)."""
import http.server, os, sys
ROOT=sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
    def send_head(s):
        p=s.translate_path(s.path)
        if not os.path.exists(p): s.path='/index.html'
        return super().send_head()
PORT=int(sys.argv[2]) if len(sys.argv)>2 else 8093
http.server.ThreadingHTTPServer(('127.0.0.1',PORT),H).serve_forever()
