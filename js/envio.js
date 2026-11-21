/* =====================================================================
 *  ENVÍO DE DATOS DE LA VERSIÓN ONLINE (hoja de Google vía Apps Script)
 * ---------------------------------------------------------------------
 *  - Cada bloque se envía en cuanto termina: si alguien deja el test a
 *    medias, se conservan las partes completas.
 *  - Al final se envía una fila de resumen de la sesión (hoja «sesiones»).
 *  - Antes de enviar, cada paquete se guarda en el navegador (cola de
 *    pendientes). Después se pregunta al servidor qué ha recibido; lo que
 *    falte se reenvía. Si quedan pendientes, se reenvían la próxima vez que
 *    se abra la página. El servidor ignora los envíos repetidos.
 *  - Sin URL configurada (MR.ONLINE.urlEnvio) no se envía nada: el
 *    participante descarga o comparte su archivo al final.
 *  El código del servidor está en online/recogida_datos.gs.
 * ===================================================================== */
window.MR = window.MR || {};

MR.Envio = {
  CLAVE: 'MR_envios_pendientes_v1',

  url() { return String((MR.ONLINE && MR.ONLINE.urlEnvio) || '').trim(); },
  configurado() { return /^https:\/\/script\.google(usercontent)?\.com\//.test(this.url()); },

  /* ---------- cola de pendientes ---------- */
  pendientes() { try { return JSON.parse(localStorage.getItem(this.CLAVE) || '[]'); } catch (e) { return []; } },
  guardarPendientes(lista) { try { localStorage.setItem(this.CLAVE, JSON.stringify(lista)); } catch (e) { /* lleno o bloqueado */ } },
  anotar(paquete) {
    const l = this.pendientes().filter(p => p.clave_envio !== paquete.clave_envio);
    l.push(paquete);
    this.guardarPendientes(l);
  },
  quitar(claves) {
    const set = new Set(claves);
    this.guardarPendientes(this.pendientes().filter(p => !set.has(p.clave_envio)));
  },

  /* ---------- paquetes ---------- */
  paqueteBloque(sesion) {
    return {
      tipo: 'ensayos', version: 2, clave_envio: sesion.id, sesion_completa: sesion.grupo,
      sujeto: sesion.participante.codigo, columnas: MR.COLUMNAS_CSV, filas: MR.valoresFilas(sesion)
    };
  },
  paqueteSesion(fila) {
    return {
      tipo: 'sesion', version: 2, clave_envio: fila.sesion_completa + '_resumen', sesion_completa: fila.sesion_completa,
      sujeto: fila.sujeto, fila
    };
  },

  /* ---------- envío ---------- */
  // POST «simple» (sin CORS): el navegador no puede leer la respuesta; por eso después se comprueba.
  async mandar(paquete) {
    if (!this.configurado()) return false;
    try {
      await fetch(this.url(), {
        method: 'POST', mode: 'no-cors', cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(paquete)
      });
      return true;
    } catch (e) { return false; }
  },

  enviar(paquete) {
    if (!this.configurado()) return Promise.resolve(false);
    this.anotar(paquete);
    return this.mandar(paquete);
  },

  // Pregunta al servidor qué envíos de esta sesión tiene (JSONP: Apps Script no admite CORS)
  comprobar(sesionCompleta, esperaMs = 15000) {
    return new Promise(res => {
      if (!this.configurado()) { res(null); return; }
      const cb = 'MR_cb_' + Math.random().toString(36).slice(2);
      const s = document.createElement('script');
      let hecho = false;
      const fin = (v) => {
        if (hecho) return;
        hecho = true; clearTimeout(t);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        s.remove(); res(v);
      };
      const t = setTimeout(() => fin(null), esperaMs);
      window[cb] = (obj) => fin(obj && obj.ok && Array.isArray(obj.recibidos) ? obj.recibidos.map(String) : null);
      s.onerror = () => fin(null);
      s.src = this.url() + (this.url().includes('?') ? '&' : '?') + 'accion=estado&sesion_completa=' +
        encodeURIComponent(sesionCompleta) + '&callback=' + cb + '&t=' + Date.now();
      document.head.appendChild(s);
    });
  },

  // Se asegura de que todo lo pendiente de esta sesión ha llegado. Devuelve true o false.
  async asegurar(sesionCompleta, avisar = () => {}) {
    if (!this.configurado()) return false;
    const repasar = (recibidos) => {
      const mios = this.pendientes().filter(p => p.sesion_completa === sesionCompleta);
      this.quitar(mios.filter(p => recibidos.includes(p.clave_envio)).map(p => p.clave_envio));
      return mios.filter(p => !recibidos.includes(p.clave_envio));
    };
    for (let intento = 1; intento <= 4; intento++) {
      if (!this.pendientes().some(p => p.sesion_completa === sesionCompleta)) return true;
      avisar(intento);
      const recibidos = await this.comprobar(sesionCompleta);
      const faltan = recibidos ? repasar(recibidos) : this.pendientes().filter(p => p.sesion_completa === sesionCompleta);
      if (!faltan.length) return true;
      if (intento < 4) {
        for (const p of faltan) await this.mandar(p); // el servidor ignora los repetidos
        await new Promise(r => setTimeout(r, 2000 * intento));
      }
    }
    return false;
  },

  // Al abrir la página: reenvía lo que quedó pendiente de otras veces
  async reintentarPendientes() {
    if (!this.configurado()) return;
    const ids = [...new Set(this.pendientes().map(p => p.sesion_completa))];
    for (const id of ids) await this.asegurar(id);
  }
};
