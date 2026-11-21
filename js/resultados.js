/* =====================================================================
 *  RESULTADOS, CSV Y ALMACENAMIENTO
 * ---------------------------------------------------------------------
 *  Medidas (mismas definiciones que neuropsych.io):
 *  - Acierto: respuesta = tipo real del par.
 *  - Precisión: aciertos / pares respondidos.
 *  - Puntuación: aciertos − errores.
 *  - TR: mediana de los aciertos.
 *  - Pendiente e intercepto: recta ajustada a la mediana de TR de
 *    aciertos en pares IGUALES en cada ángulo. Requiere ≥ 2 aciertos en
 *    pares iguales en ≥ 3 ángulos.
 * ===================================================================== */
window.MR = window.MR || {};

MR.mediana = function (xs) {
  if (!xs.length) return null;
  const a = xs.slice().sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

MR.regresion = function (xs, ys) {
  const n = xs.length; if (n < 2) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / n, my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  return { pendiente: b, intercepto: my - b * mx, r2: syy ? (sxy * sxy) / (sxx * syy) : 1 };
};

MR.resumir = function (ensayos, cfg) {
  const t = ensayos.filter(e => e.bloque === 'test');
  const resp = t.filter(e => e.respuesta);
  const aciertos = resp.filter(e => e.acierto === 1).length;
  const errores = resp.length - aciertos;
  const celdas = [];
  for (const angulo of cfg.angulos) for (const tipo of ['igual', 'espejo']) {
    const g = t.filter(e => e.angulo === angulo && e.tipo === tipo);
    const gr = g.filter(e => e.respuesta);
    const ok = gr.filter(e => e.acierto === 1);
    celdas.push({
      angulo, tipo, n: g.length, respondidos: gr.length, aciertos: ok.length,
      precision: gr.length ? ok.length / gr.length : null,
      trMediana: MR.mediana(ok.map(e => e.tr_ms))
    });
  }
  // pendiente con pares iguales
  const puntos = cfg.angulos.map(angulo => {
    const ok = t.filter(e => e.tipo === 'igual' && e.angulo === angulo && e.acierto === 1).map(e => e.tr_ms);
    return { angulo, n: ok.length, med: MR.mediana(ok) };
  }).filter(p => p.n >= 2);
  const minAngulos = Math.min(3, cfg.angulos.length);
  const reg = puntos.length >= minAngulos ? MR.regresion(puntos.map(p => p.angulo), puntos.map(p => p.med)) : null;
  return {
    pares: t.length, respondidos: resp.length, aciertos, errores, omisiones: t.length - resp.length,
    precision: resp.length ? aciertos / resp.length : null,
    puntuacion: aciertos - errores,
    trMedianaAciertos: MR.mediana(resp.filter(e => e.acierto === 1).map(e => e.tr_ms)),
    celdas, pendiente: reg ? reg.pendiente : null, intercepto: reg ? reg.intercepto : null, r2: reg ? reg.r2 : null,
    angulosEnPendiente: puntos.map(p => p.angulo)
  };
};

/* Resumen de un bloque: el de MR.resumir más la comparación con / sin distractor */
MR.resumenBloque = function (sesion) {
  const cfg = sesion.config;
  const r = MR.resumir(sesion.ensayos, cfg);
  const t = sesion.ensayos.filter(e => e.bloque === 'test');
  const parte = (filtro) => {
    const g = t.filter(filtro), resp = g.filter(e => e.respuesta), ok = resp.filter(e => e.acierto === 1);
    return { n: g.length, precision: resp.length ? ok.length / resp.length : null, tr: MR.mediana(ok.map(e => e.tr_ms)) };
  };
  let col = null;
  const D = cfg.distraccion;
  if (D && D.activa) col = D.sonido ? 'distractor_sonoro_programado' : 'distractor_visual_programado';
  else if (cfg.distractorSonoro && cfg.distractorSonoro.activo) col = 'distractor_sonoro_programado';
  else if (cfg.distractorVisual && cfg.distractorVisual.activo) col = 'distractor_visual_programado';
  r.con = col ? parte(e => e[col] === 1) : null;
  r.sin = col ? parte(e => e[col] === 0) : null;
  return r;
};

/* ---------------- CSV ---------------- */
// Las columnas nuevas van siempre AL FINAL, para no romper los scripts de análisis.
MR.COLUMNAS_CSV = [
  'sujeto', 'sesion', 'condicion', 'bloque', 'ensayo', 'figura', 'angulo', 'signo_giro', 'eje', 'tipo',
  'respuesta', 'acierto', 'tr_ms', 'sin_respuesta', 'medio_respuesta', 'respondio_tras_ocultar',
  'limite_ms', 'exposicion_ms',
  'distractor_sonoro_programado', 'distractor_sonoro', 'distractor_sonoro_detalle', 'distractor_sonoro_onset_ms',
  'distractor_visual_programado', 'distractor_visual', 'distractor_visual_detalle', 'distractor_visual_onset_ms',
  'cambios_pestana', 'visibilidad_min',
  'edad', 'genero', 'mano', 'estudios', 'vision', 'experiencia_3d', 'test_previo',
  'estrategia', 'dificultad', 'concentracion', 'fatiga', 'dispositivo', 'pantalla', 'fecha_hora',
  // añadidas el 18/11/2026 (sesión completa y versión online)
  'modalidad', 'sesion_completa', 'posicion_bloque', 'orden_bloques', 'tam_figura_px', 'orientacion',
  'sonido_comprobado', 'practica_repetida', 'interrupciones', 'origen', 'prueba',
  // añadidas el 18/11/2026 (bloque secuencial del Estudio 2)
  'presentacion', 'primera_ms', 'intervalo_ms', 'segunda_ms'
];
const COLS_PARTICIPANTE = ['edad', 'genero', 'mano', 'estudios', 'vision', 'experiencia_3d', 'test_previo'];
const COLS_FINAL = ['estrategia', 'dificultad', 'concentracion', 'fatiga', 'interrupciones'];
const COLS_SESION = {
  modalidad: s => s.modalidad || 'laboratorio',
  sesion_completa: s => s.grupo || s.id,
  posicion_bloque: s => s.posicion_bloque || '',
  orden_bloques: s => s.orden_bloques || s.orden_estudio2 || '',
  sonido_comprobado: s => s.sonido_comprobado || '',
  practica_repetida: s => s.practica_repetida ? 1 : 0,
  origen: s => s.origen || '',
  prueba: s => s.prueba ? 1 : 0
};

function celdaCsv(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// Valores (sin formatear) de cada par de una sesión, en el orden de MR.COLUMNAS_CSV
MR.valoresFilas = function (sesion) {
  const p = sesion.participante, entorno = sesion.entorno || {};
  return sesion.ensayos.map(e => MR.COLUMNAS_CSV.map(c => {
    if (c === 'sujeto') return p.codigo;
    if (c === 'sesion') return sesion.id;
    if (c === 'condicion') return sesion.condicion;
    if (COLS_PARTICIPANTE.includes(c)) return p[c];
    if (COLS_FINAL.includes(c)) return (sesion.cuestionarioFinal || {})[c];
    if (COLS_SESION[c]) return COLS_SESION[c](sesion);
    if (c === 'dispositivo') return entorno.dispositivo;
    if (c === 'pantalla') return entorno.pantalla;
    return e[c];
  }).map(v => (v === null || v === undefined) ? '' : v));
};

MR.filasCsv = function (sesion) {
  return MR.valoresFilas(sesion).map(f => f.map(celdaCsv).join(','));
};

MR.csvDeSesiones = function (sesiones) {
  const filas = [MR.COLUMNAS_CSV.join(',')];
  for (const s of sesiones) filas.push(...MR.filasCsv(s));
  return filas.join('\n') + '\n';
};

MR.descargar = function (nombre, contenido, tipo) {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

MR.nombreArchivo = function (sesion, ext) {
  const f = sesion.inicio.replace(/[:T]/g, '-').slice(0, 16);
  const cod = String(sesion.participante.codigo || 'anon').replace(/[^\w-]/g, '_');
  return `MR_${cod}_${sesion.condicion}_${f}.${ext}`;
};

// Varios bloques de la misma sesión completa en un solo archivo
MR.nombreArchivoGrupo = function (sesiones, ext) {
  if (sesiones.length === 1) return MR.nombreArchivo(sesiones[0], ext);
  const s = sesiones[0];
  const f = s.inicio.replace(/[:T]/g, '-').slice(0, 16);
  const cod = String(s.participante.codigo || 'anon').replace(/[^\w-]/g, '_');
  return `MR_${cod}_sesion${s.prueba ? '_prueba' : ''}_${f}.${ext}`;
};

/* ---------------- Almacenamiento local (copia de seguridad) ---------------- */
const CLAVE_LS = 'MR_sesiones_v1';
MR.Almacen = {
  todas() { try { return JSON.parse(localStorage.getItem(CLAVE_LS) || '[]'); } catch (e) { return []; } },
  guardar(sesion) {
    try {
      const todas = this.todas().filter(s => s.id !== sesion.id);
      todas.push(sesion);
      localStorage.setItem(CLAVE_LS, JSON.stringify(todas));
      return true;
    } catch (e) { return false; }
  },
  borrarIds(ids) {
    try {
      const set = new Set(ids);
      localStorage.setItem(CLAVE_LS, JSON.stringify(this.todas().filter(s => !set.has(s.id))));
    } catch (e) {}
  },
  // Megabytes ocupados (el navegador suele permitir unos 5 MB por sitio)
  megas() { try { return (localStorage.getItem(CLAVE_LS) || '').length * 2 / 1e6; } catch (e) { return 0; } },
  borrar() { try { localStorage.removeItem(CLAVE_LS); } catch (e) {} }
};

/* ---------------- Gráfica TR vs ángulo ---------------- */
MR.dibujarGrafica = function (canvas, resumen, cfg) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 560, H = canvas.clientHeight || 300;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const m = { l: 56, r: 16, t: 16, b: 40 };
  const angs = cfg.angulos;
  const valores = resumen.celdas.map(c => c.trMediana).filter(v => v !== null);
  if (!valores.length) { ctx.fillStyle = '#64748b'; ctx.font = '14px system-ui'; ctx.fillText('Sin aciertos suficientes para la gráfica', 20, H / 2); return; }
  const yMax = Math.ceil(Math.max(...valores) * 1.15 / 500) * 500;
  const xMin = Math.min(...angs), xMax = Math.max(...angs);
  const X = a => m.l + (xMax === xMin ? 0.5 : (a - xMin) / (xMax - xMin)) * (W - m.l - m.r);
  const Y = v => H - m.b - (v / yMax) * (H - m.t - m.b);
  ctx.font = '12px system-ui'; ctx.fillStyle = '#64748b'; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (let v = 0; v <= yMax; v += yMax / 5) {
    ctx.beginPath(); ctx.moveTo(m.l, Y(v)); ctx.lineTo(W - m.r, Y(v)); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText(Math.round(v) + ' ms', m.l - 6, Y(v) + 4);
  }
  ctx.textAlign = 'center';
  for (const a of angs) ctx.fillText(a + '°', X(a), H - m.b + 18);
  ctx.fillText('Ángulo de giro', (m.l + W - m.r) / 2, H - 4);
  const series = [{ tipo: 'igual', color: '#0f766e' }, { tipo: 'espejo', color: '#d97706' }];
  for (const s of series) {
    const pts = resumen.celdas.filter(c => c.tipo === s.tipo && c.trMediana !== null);
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = 2.5;
    ctx.beginPath(); pts.forEach((c, i) => { if (i) ctx.lineTo(X(c.angulo), Y(c.trMediana)); else ctx.moveTo(X(c.angulo), Y(c.trMediana)); }); ctx.stroke();
    for (const c of pts) { ctx.beginPath(); ctx.arc(X(c.angulo), Y(c.trMediana), 4.5, 0, 7); ctx.fill(); }
  }
  if (resumen.pendiente !== null) {
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(X(xMin), Y(resumen.intercepto + resumen.pendiente * xMin));
    ctx.lineTo(X(xMax), Y(resumen.intercepto + resumen.pendiente * xMax)); ctx.stroke(); ctx.setLineDash([]);
  }
};
