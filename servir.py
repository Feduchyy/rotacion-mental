"""Servidor local del test (sin caché, para que siempre se cargue la última versión de config.js).

Uso:
    python servir.py            -> http://localhost:8000
    python servir.py 8080       -> otro puerto
    python servir.py --panel    -> además abre el panel de resultados con los datos del proyecto
                                   (es lo que hace abrir_panel.bat con doble clic)

También puedes abrir index.html con doble clic; este servidor solo hace falta si quieres
evitar la caché del navegador, abrir el test desde otro dispositivo de la misma red
(http://IP-de-este-ordenador:8000) o usar el botón «Cargar los datos del proyecto» del
panel de resultados (http://localhost:8000/panel.html).

Ese botón lee los CSV de estas carpetas del proyecto (solo desde este mismo ordenador):
    muestras/                         datos de las personas (hojas «ensayos» y «sesiones»)
    modelo_siames/resultados/         IA-9 (red siamesa entrenada solo en 3D)
    modelo_siames/resultados_mixta/   IA-9mix (3D + 2D)
    test_chat_ia/                     resultados_chat.csv de los modelos por chat
"""
import http.server
import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

NUMEROS = [a for a in sys.argv[1:] if a.isdigit()]
PUERTO = int(NUMEROS[0]) if NUMEROS else 8000
ABRIR_PANEL = '--panel' in sys.argv
AQUI = Path(__file__).resolve().parent
PROYECTO = AQUI.parent
CARPETAS_DATOS = ['muestras', 'modelo_siames/resultados', 'modelo_siames/resultados_mixta', 'test_chat_ia']
os.chdir(AQUI)


def csv_del_proyecto():
    """CSV de las carpetas permitidas (sin subcarpetas: las semillas sueltas no hacen falta)."""
    lista = []
    for c in CARPETAS_DATOS:
        carpeta = PROYECTO / c
        if carpeta.is_dir():
            # del kit de chat, solo los resultados corregidos (no la clave de las pasadas)
            patron = 'resultados*.csv' if c == 'test_chat_ia' else '*.csv'
            lista += sorted(str(f.relative_to(PROYECTO)).replace('\\', '/') for f in carpeta.glob(patron))
    return lista


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path.startswith('/_proyecto/'):
            return self.datos_proyecto(url)
        return super().do_GET()

    def datos_proyecto(self, url):
        # Los datos solo se sirven a este mismo ordenador, nunca a otros dispositivos de la red
        if self.client_address[0] not in ('127.0.0.1', '::1', '::ffff:127.0.0.1'):
            return self.send_error(403, 'Solo desde este ordenador')
        if url.path == '/_proyecto/lista.json':
            cuerpo = json.dumps(csv_del_proyecto()).encode('utf-8')
            tipo = 'application/json; charset=utf-8'
        elif url.path == '/_proyecto/archivo':
            ruta = unquote(parse_qs(url.query).get('ruta', [''])[0])
            if ruta not in csv_del_proyecto():
                return self.send_error(404, 'Archivo no permitido')
            cuerpo = (PROYECTO / ruta).read_bytes()
            tipo = 'text/csv; charset=utf-8'
        else:
            return self.send_error(404)
        self.send_response(200)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)


if __name__ == "__main__":
    print(f"Test de rotación mental en http://localhost:{PUERTO}  (Ctrl+C para parar)")
    print(f"Panel de resultados: http://localhost:{PUERTO}/panel.html")
    servidor = http.server.ThreadingHTTPServer(("", PUERTO), SinCache)
    if ABRIR_PANEL:
        import threading
        import webbrowser
        threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{PUERTO}/panel.html?proyecto=1")).start()
    servidor.serve_forever()
