"""Servidor local del test (sin caché, para que siempre se cargue la última versión de config.js).

Uso:
    python servir.py            -> http://localhost:8000
    python servir.py 8080       -> otro puerto

También puedes abrir index.html con doble clic; este servidor solo hace falta si quieres
evitar la caché del navegador o abrir el test desde otro dispositivo de la misma red
(http://IP-de-este-ordenador:8000).
"""
import http.server
import os
import sys

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    print(f"Test de rotación mental en http://localhost:{PUERTO}  (Ctrl+C para parar)")
    http.server.ThreadingHTTPServer(("", PUERTO), SinCache).serve_forever()
