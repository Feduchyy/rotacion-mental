/* =====================================================================
 *  DISTRACCIÓN SONORA Y VISUAL
 * ---------------------------------------------------------------------
 *  Sonido generado con Web Audio (no hacen falta archivos).
 *  - sonoro(): una ráfaga de 3 pitidos (se usa en la comprobación de sonido).
 *  - continua(): distracción de un par en el test con distracción (Estudio 2).
 *    Pitidos y formas de colores a intervalos aleatorios, desde antes de
 *    que salgan las figuras hasta que la persona responde. Las formas
 *    aparecen alrededor de las figuras, sin taparlas, y entran y salen
 *    suavemente (sin destellos bruscos).
 * ===================================================================== */
window.MR = window.MR || {};

MR.Distractores = {
  ctx: null,

  // Debe llamarse tras un clic del usuario (los navegadores lo exigen). Devuelve una promesa.
  activarAudio() {
    try {
      // iPhone/iPad (Safari ≥ 16.4): que suene aunque el interruptor de silencio esté activado
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    } catch (e) { /* no disponible */ }
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state !== 'running') return this.ctx.resume().catch(() => {});
    } catch (e) { /* sin audio */ }
    return Promise.resolve();
  },

  // Un pitido corto (sinusoide de ~100 ms con rampas para que no haga «clic»)
  pitido(salida, frecuencia, enSegundos = 0) {
    const ac = this.ctx;
    const t0 = ac.currentTime + 0.005 + enSegundos;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = frecuencia;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + 0.01);
    g.gain.setValueAtTime(1, t0 + 0.09); g.gain.linearRampToValueAtTime(0, t0 + 0.1);
    o.connect(g); g.connect(salida); o.start(t0); o.stop(t0 + 0.11);
    return o;
  },

  // Ráfaga de 3 pitidos (comprobación de sonido)
  sonoro(tipo, volumen, rng) {
    const ac = this.ctx;
    if (!ac) return { tipo: 'ninguno', detalle: 'sin audio', cancelar() {} };
    const salida = ac.createGain(); salida.gain.value = volumen; salida.connect(ac.destination);
    const nodos = [], fs = [];
    for (let k = 0; k < 3; k++) {
      const f = Math.round(400 + rng() * 1200); fs.push(f);
      nodos.push(this.pitido(salida, f, k * 0.18));
    }
    return { tipo: 'pitidos', detalle: fs.join('-') + ' Hz', cancelar: () => nodos.forEach(n => { try { n.stop(); } catch (e) {} }) };
  },

  /* Distracción continua de un par. Devuelve { parar() → { pitidos, formas } }.
     op: { sonido, imagen, contenedor, evitar: {left, top, right, bottom} (relativo al contenedor),
           volumen, pitidoCadaMs: [mín, máx], formaCadaMs: [mín, máx], formaDuracionMs, rng } */
  continua(op) {
    const rng = op.rng || Math.random;
    const entre = (r) => r[0] + rng() * (r[1] - r[0]);
    const res = { pitidos: 0, formas: 0 };
    const timers = [], nodos = [];
    let activo = true;

    // ---- pitidos ----
    const ac = this.ctx;
    let salida = null;
    if (op.sonido && ac) {
      salida = ac.createGain(); salida.gain.value = op.volumen; salida.connect(ac.destination);
      const pitar = () => {
        if (!activo) return;
        nodos.push(this.pitido(salida, Math.round(400 + rng() * 1200)));
        res.pitidos++;
        timers.push(setTimeout(pitar, entre(op.pitidoCadaMs)));
      };
      pitar();
    }

    // ---- formas de colores alrededor de las figuras ----
    let capa = null, raf = null;
    if (op.imagen && op.contenedor) {
      const r = op.contenedor.getBoundingClientRect();
      const W = r.width, H = r.height, dpr = window.devicePixelRatio || 1;
      capa = document.createElement('canvas');
      capa.className = 'capa-distractor';
      capa.width = W * dpr; capa.height = H * dpr;
      capa.style.width = W + 'px'; capa.style.height = H + 'px';
      op.contenedor.appendChild(capa);
      const ctx = capa.getContext('2d'); ctx.scale(dpr, dpr);
      const colores = ['#f43f5e', '#f59e0b', '#3b82f6', '#a855f7', '#22c55e', '#ec4899'];
      const ev = op.evitar;
      let formas = [];
      const nueva = () => {
        if (!activo) return;
        const s = 12 + rng() * 16; // radio
        for (let k = 0; k < 30; k++) {
          const x = s + rng() * Math.max(1, W - 2 * s), y = s + rng() * Math.max(1, H - 2 * s);
          if (ev && x > ev.left - s - 6 && x < ev.right + s + 6 && y > ev.top - s - 6 && y < ev.bottom + s + 6) continue;
          formas.push({ x, y, s, c: colores[Math.floor(rng() * colores.length)], circulo: rng() < 0.5, t0: performance.now() });
          res.formas++;
          break;
        }
        timers.push(setTimeout(nueva, entre(op.formaCadaMs)));
      };
      const dur = op.formaDuracionMs;
      const pintar = () => {
        if (!activo) return;
        const t = performance.now();
        ctx.clearRect(0, 0, W, H);
        formas = formas.filter(f => t - f.t0 < dur);
        for (const f of formas) {
          const e = t - f.t0;
          ctx.globalAlpha = Math.max(0, Math.min(1, e / 150, (dur - e) / 200)); // entrada y salida suaves
          ctx.fillStyle = f.c;
          ctx.beginPath();
          if (f.circulo) ctx.arc(f.x, f.y, f.s, 0, 7); else ctx.rect(f.x - f.s, f.y - f.s, f.s * 2, f.s * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(pintar);
      };
      nueva();
      raf = requestAnimationFrame(pintar);
    }

    return {
      parar() {
        if (!activo) return res;
        activo = false;
        timers.forEach(clearTimeout);
        if (raf) cancelAnimationFrame(raf);
        if (capa) capa.remove();
        nodos.forEach(n => { try { n.stop(); } catch (e) {} });
        return res;
      }
    };
  }
};
