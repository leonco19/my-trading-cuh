# My Trading Cuh - tiny local web server, run silently by start.vbs (pythonw = no console window).
# Logging is switched off because pythonw has no console to print to.
import functools, http.server, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        # Always serve the newest files (the service worker handles offline caching).
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


QuietHandler.extensions_map.update({'.webmanifest': 'application/manifest+json', '.js': 'text/javascript'})

if __name__ == '__main__':
    handler = functools.partial(QuietHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler) as httpd:
        httpd.serve_forever()
