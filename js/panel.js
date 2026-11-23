/* =====================================================================
 *  PANEL DE RESULTADOS (panel.html) · organizado por hipótesis
 * ---------------------------------------------------------------------
 *  Lee los CSV del test (hojas «ensayos» y «sesiones» de la versión
 *  online, CSV del laboratorio), de la red siamesa (IA-9, IA-9mix) y de
 *  los modelos por chat, y muestra:
 *    resumen de hipótesis · muestra y exclusiones · H1 ángulo ·
 *    H7 2D frente a 3D · H2 distracción · orden (práctica y cansancio) ·
 *    personas frente a IA (H3–H6) · diferencias individuales · participantes
 *  Cada gráfico tiene tabla de datos y botón para descargarlo en PNG.
 *  Los veredictos y las «posibles explicaciones» se generan con los datos
 *  cargados (p < 0,05); son un punto de partida para la discusión.
 *  Todo se calcula en el navegador; no se envía nada.
 * ===================================================================== */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Paleta categórica de referencia (orden fijo, validada). El color sigue a la entidad en todo el panel.
  const PALETA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
  const TESTS = ['sin_limite', 'distraccion', 'control_2d'];
  const NOMBRE = { sin_limite: 'Normal (3D)', distraccion: 'Distracción (3D)', control_2d: 'Control 2D' };
  const CORTO = { sin_limite: 'normal', distraccion: 'distracción', control_2d: '2D' };
  const COLOR = { sin_limite: PALETA[0], distraccion: PALETA[1], control_2d: PALETA[2] };
  const COLOR_PERSONAS = PALETA[0];

  /* =================== formato =================== */
  const esNum = (x) => typeof x === 'number' && Number.isFinite(x);
  const num = (x, d = 1) => esNum(x) ? x.toFixed(d).replace('.', ',').replace(/^-/, '−') : '—';
  const pct = (x, d = 0) => esNum(x) ? num(x * 100, d) + ' %' : '—';
  const ms = (x) => esNum(x) ? Math.round(x).toLocaleString('es-ES') + ' ms' : '—';
  const seg = (x, d = 1) => esNum(x) ? num(x / 1000, d) + ' s' : '—';
  const pp = (x, d = 1) => esNum(x) ? num(x * 100, d) + ' pp' : '—';
  const signo = (x, f) => esNum(x) ? (x > 0 ? '+' : x < 0 ? '−' : '') + f(Math.abs(x)) : '—';
  const fp = (p) => !esNum(p) ? '' : p < 0.001 ? 'p < 0,001' : 'p = ' + p.toFixed(3).replace('.', ',');
  const sig = (r) => r && esNum(r.p) && r.p < 0.05;
  const est = (t) => `<span class="estad">${t}</span>`;
  const tTexto = (r) => r && esNum(r.t) ? est(`t(${num(r.gl, r.gl % 1 ? 1 : 0)}) = ${num(r.t, 2)}, ${fp(r.p)}${esNum(r.d) ? `, d = ${num(r.d, 2)}` : ''}`) : '';

  /* =================== estadística =================== */
  const limpio = (xs) => xs.filter(esNum);
  const media = (xs) => { xs = limpio(xs); return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null; };
  const desv = (xs) => { xs = limpio(xs); if (xs.length < 2) return null; const m = media(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1)); };
  const eeDe = (xs) => { const d = desv(xs); return d === null ? null : d / Math.sqrt(limpio(xs).length); };
  function mediana(xs) { xs = limpio(xs).sort((a, b) => a - b); if (!xs.length) return null; const m = xs.length >> 1; return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2; }
  function lnGamma(z) {
    const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    z -= 1; let x = 0.99999999999980993;
    for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function betaInc(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    const cf = (x, a, b) => {
      let c = 1, d = 1 - (a + b) * x / (a + 1); d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); let h = d;
      for (let m = 1; m <= 300; m++) {
        const m2 = 2 * m;
        let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
        d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); c = 1 + aa / c; c = Math.abs(c) < 1e-30 ? 1e-30 : c; h *= d * c;
        aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
        d = 1 + aa * d; d = 1 / (Math.abs(d) < 1e-30 ? 1e-30 : d); c = 1 + aa / c; c = Math.abs(c) < 1e-30 ? 1e-30 : c;
        const del = d * c; h *= del;
        if (Math.abs(del - 1) < 3e-12) break;
      }
      return h;
    };
    return x < (a + 1) / (a + b + 2) ? bt * cf(x, a, b) / a : 1 - bt * cf(1 - x, b, a) / b;
  }
  const pT = (t, gl) => betaInc(gl / (gl + t * t), gl / 2, 0.5);          // bilateral
  const pF = (F, d1, d2) => betaInc(d2 / (d2 + d1 * F), d2 / 2, d1 / 2);
  function tCrit(gl) { let lo = 0, hi = 80; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (pT(m, gl) > 0.05) lo = m; else hi = m; } return (lo + hi) / 2; }
  function tUna(xs, mu = 0) {
    xs = limpio(xs); const n = xs.length; if (n < 2) return null;
    const m = media(xs), s = desv(xs), e = s / Math.sqrt(n);
    if (!e) return { n, m, e: 0, t: null, gl: n - 1, p: null, d: null, ic: 0 };
    const t = (m - mu) / e;
    return { n, m, e, t, gl: n - 1, p: pT(t, n - 1), d: (m - mu) / s, ic: tCrit(n - 1) * e };
  }
  function tApareada(a, b) { const d = []; a.forEach((x, i) => { if (esNum(x) && esNum(b[i])) d.push(x - b[i]); }); return tUna(d); }
  function welch(a, b) {   // media(a) − media(b), entre personas distintas
    a = limpio(a); b = limpio(b); if (a.length < 2 || b.length < 2) return null;
    const ma = media(a), mb = media(b), va = desv(a) ** 2 / a.length, vb = desv(b) ** 2 / b.length, e = Math.sqrt(va + vb);
    if (!e) return { m: ma - mb, e: 0, t: null, p: null, na: a.length, nb: b.length };
    const t = (ma - mb) / e, gl = (va + vb) ** 2 / (va * va / (a.length - 1) + vb * vb / (b.length - 1));
    return { m: ma - mb, e, t, gl, p: pT(t, gl), na: a.length, nb: b.length };
  }
  function anovaRM(matriz) {   // un factor intra-sujeto; filas completas
    const m = matriz.filter(f => f.length && f.every(esNum)); const n = m.length, k = m.length ? m[0].length : 0;
    if (n < 3 || k < 2) return null;
    const gm = m.flat().reduce((s, x) => s + x, 0) / (n * k);
    const mc = Array.from({ length: k }, (_, j) => m.reduce((s, f) => s + f[j], 0) / n);
    const ms_ = m.map(f => f.reduce((s, x) => s + x, 0) / k);
    const ssC = n * mc.reduce((s, x) => s + (x - gm) ** 2, 0), ssS = k * ms_.reduce((s, x) => s + (x - gm) ** 2, 0);
    const ssT = m.flat().reduce((s, x) => s + (x - gm) ** 2, 0), ssE = ssT - ssC - ssS;
    const gl1 = k - 1, gl2 = (k - 1) * (n - 1), F = (ssC / gl1) / (ssE / gl2);
    return { F, gl1, gl2, p: pF(F, gl1, gl2), eta: ssC / (ssC + ssE), n };
  }
  const fTexto = (r) => r ? est(`F(${r.gl1}, ${r.gl2}) = ${num(r.F, 2)}, ${fp(r.p)}, η²p = ${num(r.eta, 2)}`) : '';
  function rangos(xs) {
    const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = new Array(xs.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rr = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rr; i = j + 1; }
    return r;
  }
  function pearson(x, y) {
    const mx = media(x), my = media(y); let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }
  function spearman(x, y) {
    const pares = x.map((v, i) => [v, y[i]]).filter(([a, b]) => esNum(a) && esNum(b)); const n = pares.length;
    if (n < 5) return null;
    const r = pearson(rangos(pares.map(q => q[0])), rangos(pares.map(q => q[1]))); if (!esNum(r)) return null;
    const t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r));
    return { r, n, p: Math.abs(r) >= 1 ? 0 : pT(t, n - 2) };
  }
  function binomCola(k, n) { let s = 0; for (let i = k; i <= n; i++) s += Math.exp(lnGamma(n + 1) - lnGamma(i + 1) - lnGamma(n - i + 1) - n * Math.LN2); return Math.min(1, s); }
  function recta(xs, ys) {
    const mx = media(xs), my = media(ys); let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    const b = sxx ? sxy / sxx : 0;
    return { pendiente: b, ordenada: my - b * mx, r2: sxx && syy ? (sxy * sxy) / (sxx * syy) : null };
  }

  /* =================== datos =================== */
  let filas = [];                 // pares de personas e IA
  const perfiles = new Map();     // sujeto → datos generales, cuestionario y sesión
  const cargados = [];
  const claves = new Set();
  const num0 = (v) => { if (v === undefined || v === null || v === '') return null; const x = parseFloat(String(v).replace(',', '.')); return Number.isNaN(x) ? null : x; };
  const CAMPOS_PERFIL = ['edad', 'genero', 'mano', 'estudios', 'vision', 'experiencia_3d', 'test_previo', 'estrategia', 'dificultad',
    'concentracion', 'fatiga', 'interrupciones', 'dispositivo', 'sonido_comprobado', 'duracion_min', 'descansos_s', 'estado', 'orden_bloques'];

  function parsearCsv(texto) {
    texto = texto.replace(/^﻿/, '');
    const out = []; let fila = [], campo = '', comillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (comillas) {
        if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false; }
        else campo += c;
      } else if (c === '"') comillas = true;
      else if (c === ',') { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(campo); campo = '';
        if (fila.length > 1 || fila[0] !== '') out.push(fila);
        fila = [];
      } else campo += c;
    }
    if (campo !== '' || fila.length) { fila.push(campo); out.push(fila); }
    if (!out.length) return [];
    const cab = out[0].map(s => s.trim());
    return out.slice(1).map(f => Object.fromEntries(cab.map((c, i) => [c, f[i] === undefined ? '' : f[i]])));
  }

  function anotarPerfil(sujeto, f, manda) {
    if (!sujeto) return;
    const p = perfiles.get(sujeto) || {};
    for (const c of CAMPOS_PERFIL) {
      const v = f[c];
      if (v === undefined || v === '') continue;
      if (manda || p[c] === undefined || p[c] === '') p[c] = v;
    }
    perfiles.set(sujeto, p);
  }

  function normalizar(f, archivo) {
    if (!f.angulo || !f.tipo || !f.sujeto) return null;
    const esIA = f.agente === 'ia' || f.agente === 'ia_chat' || /^red_siamesa/.test(f.modelo || '');
    let condicion = MR.claveBase(f.condicion || '');
    if (!condicion) condicion = /2d/i.test(archivo) ? 'control_2d' : 'sin_limite';
    const respondida = f.respuesta === 'igual' || f.respuesta === 'espejo';
    const r = {
      ia: esIA, condicion, bloque: f.bloque || 'test', angulo: num0(f.angulo), tipo: f.tipo, respuesta: f.respuesta,
      acierto: f.acierto === '' || f.acierto === undefined ? (respondida ? +(f.respuesta === f.tipo) : null) : num0(f.acierto),
      tr: num0(f.tr_ms), inferencia: num0(f.tiempo_inferencia_ms),
      prueba: f.prueba === '1' || /_demo$/.test(f.condicion || ''),
      modalidad: esIA ? 'ia' : (f.modalidad || 'laboratorio'), dispositivo: f.dispositivo || '', sonido: f.sonido_comprobado || '',
      simulado: !!f.simulado, orden: f.orden_bloques || f.orden_estudio2 || '', posicion: num0(f.posicion_bloque),
      dsProg: f.distractor_sonoro_programado === '1', dvProg: f.distractor_visual_programado === '1'
    };
    if (esIA) {
      r.agente = f.agente === 'ia_chat' ? (f.modelo || f.sujeto) + (f.ejemplos === '1' ? ' (con ejemplos)' : '')
        : String(f.sujeto || 'IA-9').replace(/_s\d+$/, '');
      r.chat = f.agente === 'ia_chat';
      r.sujeto = r.agente + '|' + (f.sujeto || '') + '|' + (f.repeticion || '');
      r.clave = ['ia', r.sujeto, condicion, r.bloque, f.ensayo, f.figura, f.angulo, f.tipo].join('|');
    } else {
      r.sujeto = f.sujeto;
      r.clave = ['h', f.sujeto, f.sesion, condicion, r.bloque, f.ensayo].join('|');
      anotarPerfil(f.sujeto, f, false);
    }
    return r;
  }

  function anadir(registros, nombre, tipo, diferir) {
    let n = 0;
    for (const r of registros) {
      if (!r || claves.has(r.clave)) continue;
      claves.add(r.clave); filas.push(r); n++;
    }
    cargados.push({ nombre, n, tipo });
    pintarArchivos();
    if (!diferir) recalcular();
  }

  function procesarTexto(texto, nombre, diferir) {
    const datos = parsearCsv(String(texto));
    const cab = datos.length ? Object.keys(datos[0]) : [];
    if (cab.includes('angulo') && cab.includes('tipo')) {
      const regs = datos.map(f => normalizar(f, nombre));
      const ia = regs.some(r => r && r.ia), hum = regs.some(r => r && !r.ia);
      anadir(regs, nombre, ia && hum ? 'mixto' : ia ? 'IA' : hum ? 'personas' : 'sin datos reconocibles', diferir);
    } else if (cab.includes('sujeto') && (cab.includes('sesion_completa') || cab.includes('estrategia'))) {
      let n = 0;
      for (const f of datos) if (f.sujeto) { anotarPerfil(f.sujeto, f, true); n++; }
      cargados.push({ nombre, n, tipo: 'hoja sesiones' });
      pintarArchivos();
      if (!diferir) recalcular();
    } else {
      cargados.push({ nombre, n: 0, tipo: 'no reconocido' });
      pintarArchivos();
    }
  }

  function leerArchivos(lista) {
    const archivos = [...lista];
    let pendientes = archivos.length;
    for (const archivo of archivos) {
      const lector = new FileReader();
      lector.onload = () => { procesarTexto(lector.result, archivo.name, true); if (--pendientes === 0) recalcular(); };
      lector.readAsText(archivo, 'utf-8');
    }
  }

  /* =================== carga =================== */
  const zona = $('zona-carga');
  $('entrada-archivos').addEventListener('change', (e) => { leerArchivos(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.add('encima'); }));
  ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.remove('encima'); }));
  zona.addEventListener('drop', (e) => leerArchivos(e.dataTransfer.files));

  async function cargarProyecto() {
    const estado = $('estado-carga');
    estado.textContent = 'Buscando los datos del proyecto…';
    try {
      const r = await fetch('/_proyecto/lista.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const lista = await r.json();
      if (!lista.length) { estado.textContent = 'No hay CSV en las carpetas del proyecto (muestras/, modelo_siames/…).'; return; }
      for (const ruta of lista) {
        const t = await fetch('/_proyecto/archivo?ruta=' + encodeURIComponent(ruta), { cache: 'no-store' });
        if (t.ok) procesarTexto(await t.text(), ruta, true);
      }
      estado.textContent = `Cargados ${lista.length} archivos del proyecto: ${lista.join(' · ')}`;
      recalcular();
    } catch (e) {
      estado.innerHTML = 'No se han podido leer los datos del proyecto. Abre el panel con <code>python servir.py</code> (en la carpeta del test) en <b>http://localhost:8000/panel.html</b>, o arrastra los CSV aquí.';
    }
  }
  $('btn-proyecto').addEventListener('click', cargarProyecto);
  $('btn-navegador').addEventListener('click', () => {
    const sesiones = MR.Almacen.todas();
    const regs = [];
    for (const s of sesiones) for (const v of MR.valoresFilas(s)) regs.push(normalizar(Object.fromEntries(MR.COLUMNAS_CSV.map((c, i) => [c, String(v[i])])), 'navegador'));
    anadir(regs, `Guardados en este navegador (${sesiones.length} bloques)`, 'personas');
  });
  $('btn-simulados').addEventListener('click', () => anadir(simular(), 'DATOS SIMULADOS (36 personas)', 'simulados'));
  $('btn-vaciar').addEventListener('click', () => { filas = []; cargados.length = 0; claves.clear(); perfiles.clear(); pintarArchivos(); recalcular(); });
  ['f-prueba', 'f-modalidad', 'f-completo', 'f-precision', 'f-umbral', 'f-rapidos', 'f-tr', 'f-sonido', 'f-azar', 'f-primero']
    .forEach(id => $(id).addEventListener('input', recalcular));

  function pintarArchivos() {
    $('archivos').innerHTML = cargados.map(c => `<span class="chip ${c.tipo === 'simulados' ? 'prueba' : c.tipo === 'IA' ? 'online' : ''}">${esc(c.nombre)} · ${c.n} ${c.tipo === 'hoja sesiones' ? 'personas' : 'filas'} · ${esc(c.tipo)}</span>`).join('');
    $('aviso-sim').hidden = !filas.some(r => r.simulado);
    $('resultados').hidden = !filas.length;
  }

  /* =================== datos simulados (solo para ver el panel) =================== */
  function simular() {
    let semilla = 12345;
    const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    const normal = () => Math.sqrt(-2 * Math.log(azar() + 1e-9)) * Math.cos(2 * Math.PI * azar());
    const regs = [];
    const ordenes = MR.ordenesPosibles(['sin_limite', 'distraccion', 'control_2d']);
    const paresPorCelda = { sin_limite: 6, distraccion: 4, control_2d: 6 };
    for (let p = 1; p <= 36; p++) {
      const sujeto = 'SIM' + String(p).padStart(2, '0');
      const modalidad = p % 3 ? 'online' : 'laboratorio';
      const habil = normal(), lento = Math.exp(normal() * 0.25), pend = 22 + normal() * 6 - habil * 3;
      const plan = ordenes[(p - 1) % ordenes.length], orden = plan.join('>');
      const perfil = {
        edad: String(18 + Math.floor(azar() * 40)), genero: azar() < 0.5 ? 'Mujer' : 'Hombre', estudios: azar() < 0.4 ? 'STEM' : 'No STEM',
        experiencia_3d: String(Math.floor(azar() * 5)), estrategia: azar() < 0.5 ? 'girar_figura' : 'mixta',
        dificultad: String(2 + Math.floor(azar() * 3)), concentracion: String(2 + Math.floor(azar() * 4)), fatiga: String(1 + Math.floor(azar() * 4))
      };
      plan.forEach((condicion, posicion) => {
        const porCelda = paresPorCelda[condicion], con = condicion === 'distraccion', es2D = condicion === 'control_2d';
        let ensayo = 0;
        for (const angulo of [0, 50, 100, 150]) for (const tipo of ['igual', 'espejo']) for (let i = 0; i < porCelda; i++) {
          const base = (es2D ? 1300 : 1900) + (es2D ? 0.5 : 1) * pend * angulo + (tipo === 'espejo' ? 300 : 0) - (con ? 300 : 0);
          const tr = Math.max(350, base * lento * (1 - 0.06 * posicion) * Math.exp(normal() * 0.3));
          const pA = 0.96 - 0.0013 * angulo + 0.02 * habil - (tipo === 'espejo' ? 0.03 : 0) - (con ? 0.05 : 0) + (es2D ? 0.02 : 0) + (con ? 0.06 * posicion : -0.02 * posicion);
          const acierto = azar() < Math.min(0.995, pA) ? 1 : 0;
          ensayo++;
          regs.push(normalizar(Object.assign({
            sujeto, sesion: sujeto + '_' + condicion, condicion, bloque: 'test', ensayo: String(ensayo), angulo: String(angulo), tipo,
            respuesta: acierto ? tipo : (tipo === 'igual' ? 'espejo' : 'igual'), acierto: String(acierto), tr_ms: tr.toFixed(1),
            distractor_sonoro_programado: con ? '1' : '0', distractor_visual_programado: con ? '1' : '0',
            orden_bloques: orden, posicion_bloque: String(posicion + 1), modalidad, prueba: '0',
            dispositivo: p % 4 === 0 ? 'ordenador' : 'movil', sonido_comprobado: con ? 'si' : '', simulado: true
          }, perfil), 'simulados'));
        }
      });
    }
    return regs;
  }

  /* =================== medidas por persona y test =================== */
  function medidas(rs, angulos) {
    const resp = rs.filter(r => r.acierto !== null);
    const aciertos = resp.filter(r => r.acierto === 1).length;
    const trOk = (lista) => mediana(lista.filter(r => r.acierto === 1 && r.tr !== null).map(r => r.tr));
    const prec = (lista) => lista.length ? lista.filter(r => r.acierto === 1).length / lista.length : null;
    const porA = {}, puntos = [];
    for (const a of angulos) {
      const ra = resp.filter(r => r.angulo === a), ig = ra.filter(r => r.tipo === 'igual'), es = ra.filter(r => r.tipo === 'espejo');
      const okI = ig.filter(r => r.acierto === 1 && r.tr !== null).map(r => r.tr);
      porA[a] = { prec: prec(ra), precI: prec(ig), precE: prec(es), trI: mediana(okI), trE: trOk(es), tr: trOk(ra) };
      if (okI.length >= 2) puntos.push([a, mediana(okI)]);
    }
    const espejos = resp.filter(r => r.tipo === 'espejo');
    return {
      n: resp.length, aciertos, prec: prec(resp), tr: trOk(resp), trI: trOk(resp.filter(r => r.tipo === 'igual')), trE: trOk(espejos), porA,
      pend: puntos.length >= 3 ? recta(puntos.map(q => q[0]), puntos.map(q => q[1])).pendiente : null,
      fa: espejos.length ? espejos.filter(r => r.respuesta === 'igual').length / espejos.length : null
    };
  }
  // Media ± EE por ángulo de una medida de las personas (p.tests[c].porA[a][campo])
  function serieA(lista, c, campo, angulos, f = (x) => x) {
    const m = new Map();
    for (const a of angulos) {
      const vals = limpio(lista.map(p => p.tests[c] && p.tests[c].porA[a] ? f(p.tests[c].porA[a][campo], p) : null));
      if (vals.length) m.set(a, { y: media(vals), ee: eeDe(vals), n: vals.length });
    }
    return m;
  }

  function leerCriterios() {
    return {
      prueba: $('f-prueba').checked, modalidad: $('f-modalidad').value, completo: $('f-completo').checked,
      precision: $('f-precision').checked, umbral: (+$('f-umbral').value || 0) / 100, rapidos: $('f-rapidos').checked,
      tr: $('f-tr').checked, sonido: $('f-sonido').checked, azar: $('f-azar').checked, primero: $('f-primero').checked
    };
  }

  /* =================== análisis =================== */
  let medidaDif = 'prec';   // medida de la sección «Diferencias individuales»

  function analizar() {
    const o = leerCriterios();
    const humTodos = filas.filter(r => !r.ia && r.bloque === 'test');
    const iaFilas = filas.filter(r => r.ia && r.bloque === 'test');
    const angulos = [...new Set((humTodos.length ? humTodos : filas).map(r => r.angulo).filter(esNum))].sort((a, b) => a - b);
    const conDatos = new Set(humTodos.map(r => r.sujeto)).size;
    const hum = humTodos.filter(r => (!o.prueba || !r.prueba) && (!o.modalidad || r.modalidad === o.modalidad));
    const grupos = new Map();
    for (const r of hum) { if (!grupos.has(r.sujeto)) grupos.set(r.sujeto, []); grupos.get(r.sujeto).push(r); }
    const valido = (r) => !o.tr || (r.tr !== null && r.tr >= 300 && r.tr <= 20000);

    const personas = [];
    for (const [sujeto, rs] of grupos) {
      const perfil = perfiles.get(sujeto) || {};
      const e1 = rs.filter(r => r.condicion === 'sin_limite');
      const precE1 = e1.length ? e1.filter(r => r.acierto === 1).length / e1.length : null;
      const trE1 = mediana(e1.map(r => r.tr));
      let paso = 0, motivo = null;
      if (o.completo && e1.length < 48) { paso = 1; motivo = 'no terminó el test normal'; }
      else if (o.precision && precE1 !== null && precE1 < o.umbral) { paso = 2; motivo = `precisión en el test normal del ${pct(precE1)}`; }
      else if (o.rapidos && trE1 !== null && trE1 < 300) { paso = 3; motivo = `respondía sin mirar (TR mediano de ${ms(trE1)})`; }
      if (!e1.length && !motivo) { paso = 1; motivo = 'sin test normal'; }
      const validos = rs.filter(valido);
      const tests = {}, alAzar = [];
      for (const c of TESTS) {
        const rc = validos.filter(r => r.condicion === c);
        if (!rc.length) continue;
        const m = medidas(rc, angulos);
        const conPos = rs.find(r => r.condicion === c && r.posicion !== null);
        m.pos = conPos ? conPos.posicion : null;
        m.alAzar = m.n >= 10 && binomCola(m.aciertos, m.n) >= 0.05;
        if (m.alAzar) alAzar.push(c);
        if (o.azar && m.alAzar) continue;
        tests[c] = m;
      }
      const sonidoTxt = String(perfil.sonido_comprobado || (rs.find(r => r.condicion === 'distraccion' && r.sonido) || {}).sonido || '').toLowerCase();
      personas.push({
        sujeto, perfil, tests, alAzar, precE1, trE1, nE1: e1.length, paso, motivo, sinSonido: sonidoTxt === 'no',
        orden: (rs.find(r => r.orden) || {}).orden || perfil.orden_bloques || '', modalidad: rs[0].modalidad,
        dispositivo: rs[0].dispositivo || perfil.dispositivo || '', simulado: rs[0].simulado,
        rapidos: rs.filter(r => r.tr !== null && r.tr < 300).length, nPares: rs.length, quitados: rs.length - validos.length
      });
    }
    const L = personas.filter(p => !p.motivo);
    const A = { o, angulos, personas, incluidos: L, conDatos };

    // ---- muestra ----
    const todosPares = humTodos.filter(r => (!o.prueba || !r.prueba));
    const rapidos = todosPares.filter(r => r.tr !== null && r.tr < 300);
    A.muestra = {
      embudo: [
        ['Personas con algún dato', conDatos],
        [o.prueba ? 'Sin los datos de prueba del grupo' : 'Personas (con datos de prueba)', personas.length],
        ['Con el test normal completo', personas.filter(p => p.paso === 0 || p.paso > 1).length],
        [`Precisión en el test normal ≥ ${Math.round(o.umbral * 100)} %`, personas.filter(p => p.paso === 0 || p.paso > 2).length],
        ['Sin responder a ciegas → muestra analizada', L.length]
      ],
      rapidos: rapidos.length, rapidosMovil: rapidos.filter(r => r.dispositivo === 'movil').length, precRapidos: rapidos.length ? rapidos.filter(r => r.acierto === 1).length / rapidos.length : null,
      fuera: L.reduce((s, p) => s + p.quitados, 0), paresL: L.reduce((s, p) => s + p.nPares, 0),
      tresTests: personas.filter(p => TESTS.every(c => p.tests[c] || p.alAzar.includes(c))).length,
      ordenes: (() => { const m = new Map(); L.forEach(p => { if (p.orden) m.set(p.orden, (m.get(p.orden) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); })(),
      edad: limpio(L.map(p => num0(p.perfil.edad))),
      duracion: limpio(L.map(p => num0(p.perfil.duracion_min))),
      descansos: limpio(L.flatMap(p => String(p.perfil.descansos_s || '').split(/\s+/).map(num0)))
    };

    // ---- H1: efecto del ángulo (test normal) ----
    const n1 = L.filter(p => p.tests.sin_limite);
    const T1 = (p) => p.tests.sin_limite;
    const h1 = { n: n1.length };
    if (n1.length >= 2) {
      h1.anovaTr = anovaRM(n1.map(p => angulos.map(a => T1(p).porA[a].trI)));
      h1.anovaPrec = anovaRM(n1.map(p => angulos.map(a => T1(p).porA[a].prec)));
      h1.pend = tUna(n1.map(p => T1(p).pend));
      h1.positivas = limpio(n1.map(p => T1(p).pend));
      h1.curva = angulos.map(a => media(n1.map(p => T1(p).porA[a].trI)));
      h1.curvaPrec = angulos.map(a => media(n1.map(p => T1(p).porA[a].prec)));
      h1.r2 = h1.curva.every(esNum) && angulos.length >= 3 ? recta(angulos, h1.curva).r2 : null;
      h1.velocidad = h1.pend && h1.pend.m > 0 ? 1000 / h1.pend.m : null;
      h1.espejo = tApareada(n1.map(p => T1(p).trE), n1.map(p => T1(p).trI));
    }
    A.h1 = h1;

    // ---- H7: 2D frente a 3D (personas) ----
    const par2 = L.filter(p => p.tests.sin_limite && p.tests.control_2d);
    const T2 = (p) => p.tests.control_2d;
    A.h7 = { n: par2.length, lista: par2 };
    if (par2.length >= 2) {
      Object.assign(A.h7, {
        prec: tApareada(par2.map(p => T2(p).prec), par2.map(p => T1(p).prec)),
        tr: tApareada(par2.map(p => T2(p).tr), par2.map(p => T1(p).tr)),
        pend: tApareada(par2.map(p => T2(p).pend), par2.map(p => T1(p).pend)),
        pend2: tUna(par2.map(p => T2(p).pend)), pend3: media(par2.map(p => T1(p).pend)), pend2m: media(par2.map(p => T2(p).pend)),
        fa3: media(par2.map(p => T1(p).fa)), fa2: media(par2.map(p => T2(p).fa)),
        fa: tApareada(par2.map(p => T2(p).fa), par2.map(p => T1(p).fa)),
        anova2: anovaRM(par2.map(p => angulos.map(a => T2(p).porA[a].trI)))
      });
    }

    // ---- H2: distracción ----
    const parD = L.filter(p => p.tests.sin_limite && p.tests.distraccion && !(o.sonido && p.sinSonido));
    const TD = (p) => p.tests.distraccion;
    A.h2 = { n: parD.length, lista: parD, sinSonido: L.filter(p => p.sinSonido).length };
    if (parD.length >= 2) {
      const normalAntes = parD.filter(p => esNum(T1(p).pos) && esNum(TD(p).pos) && T1(p).pos < TD(p).pos);
      const distAntes = parD.filter(p => esNum(T1(p).pos) && esNum(TD(p).pos) && TD(p).pos < T1(p).pos);
      const efecto = (p) => TD(p).prec - T1(p).prec;
      Object.assign(A.h2, {
        prec: tApareada(parD.map(p => TD(p).prec), parD.map(p => T1(p).prec)),
        tr: tApareada(parD.map(p => TD(p).tr), parD.map(p => T1(p).tr)),
        pend: tApareada(parD.map(p => TD(p).pend), parD.map(p => T1(p).pend)),
        inter: anovaRM(parD.map(p => angulos.map(a => esNum(TD(p).porA[a].trI) && esNum(T1(p).porA[a].trI) ? TD(p).porA[a].trI - T1(p).porA[a].trI : null))),
        porA: angulos.map(a => ({ a, d: media(parD.map(p => TD(p).porA[a].prec - T1(p).porA[a].prec)) })),
        normalAntes, distAntes,
        ordenW: welch(normalAntes.map(efecto), distAntes.map(efecto)),
        efNormalAntes: media(normalAntes.map(efecto)), efDistAntes: media(distAntes.map(efecto)),
        distPrimero: media(L.filter(p => p.tests.distraccion && TD(p).pos === 1).map(p => TD(p).prec)),
        distDespues: media(L.filter(p => p.tests.distraccion && TD(p).pos > 1).map(p => TD(p).prec))
      });
    }

    // ---- orden de los tests ----
    A.orden = TESTS.map(c => {
      const lst = L.filter(p => p.tests[c] && esNum(p.tests[c].pos));
      const porPos = [1, 2, 3].map(k => {
        const g = lst.filter(p => p.tests[c].pos === k);
        return { k, n: g.length, prec: media(g.map(p => p.tests[c].prec)), precE: eeDe(g.map(p => p.tests[c].prec)), tr: media(g.map(p => p.tests[c].tr)), trE: eeDe(g.map(p => p.tests[c].tr)) };
      });
      const tarde = lst.filter(p => p.tests[c].pos > 1), pronto = lst.filter(p => p.tests[c].pos === 1);
      return { c, n: lst.length, porPos, wPrec: welch(tarde.map(p => p.tests[c].prec), pronto.map(p => p.tests[c].prec)), wTr: welch(tarde.map(p => p.tests[c].tr), pronto.map(p => p.tests[c].tr)) };
    });

    // ---- IA ----
    const rango = (x) => /^IA-9$/.test(x) ? 0 : /^IA-9mix/.test(x) ? 1 : 2;
    const agentes = [...new Set(iaFilas.map(r => r.agente))].sort((a, b) => rango(a) - rango(b) || a.localeCompare(b, 'es'));
    const colorAgente = { Personas: COLOR_PERSONAS };
    agentes.forEach((a, i) => { colorAgente[a] = PALETA[3 + (i % 5)]; });
    const ia = {};
    for (const ag of agentes) {
      ia[ag] = {};
      for (const c of ['sin_limite', 'control_2d']) {
        const rs = iaFilas.filter(r => r.agente === ag && r.condicion === c);
        if (!rs.length) continue;
        const reps = [...new Set(rs.map(r => r.sujeto))];
        const precRep = (lista) => { const v = lista.filter(r => r.acierto !== null); return v.length ? v.filter(r => r.acierto === 1).length / v.length : null; };
        const porA = new Map(), inf = new Map();
        for (const a of angulos) {
          const vals = limpio(reps.map(s => precRep(rs.filter(r => r.sujeto === s && r.angulo === a))));
          if (vals.length) porA.set(a, { y: media(vals), ee: eeDe(vals), n: vals.length });
          const t = limpio(rs.filter(r => r.angulo === a).map(r => r.inferencia));
          if (t.length) inf.set(a, media(t));
        }
        const totales = limpio(reps.map(s => precRep(rs.filter(r => r.sujeto === s))));
        ia[ag][c] = { porA, inf, total: media(totales), reps: reps.length, chat: rs[0].chat };
      }
    }
    const humanosIA = (c) => L.filter(p => p.tests[c] && (!o.primero || p.tests[c].pos === 1));
    A.ia = { agentes, colorAgente, ia, humanosIA, chat: agentes.filter(a => Object.values(ia[a]).some(x => x.chat)) };

    // ---- diferencias individuales ----
    const MEDIDAS = {
      prec: { nombre: 'Precisión en el test normal', f: p => T1(p) && T1(p).prec, fmt: x => pct(x, 1), eje: x => pct(x), escala: 'pct' },
      tr: { nombre: 'TR mediano en el test normal', f: p => T1(p) && T1(p).tr, fmt: ms, escala: 'ms' },
      pend: { nombre: 'Pendiente en el test normal (ms/°)', f: p => T1(p) && T1(p).pend, fmt: x => num(x, 1) + ' ms/°', eje: x => num(x, 0) + ' ms/°', escala: 'num' },
      prec2d: { nombre: 'Precisión en el control 2D', f: p => p.tests.control_2d && p.tests.control_2d.prec, fmt: x => pct(x, 1), eje: x => pct(x), escala: 'pct' },
      precDist: { nombre: 'Precisión con distracción', f: p => p.tests.distraccion && p.tests.distraccion.prec, fmt: x => pct(x, 1), eje: x => pct(x), escala: 'pct' }
    };
    const VARS = [
      { id: 'genero', nombre: 'Género', valor: p => ({ Hombre: 'Hombre', Mujer: 'Mujer' })[p.perfil.genero] || (p.perfil.genero ? 'Otro' : null), orden: ['Mujer', 'Hombre', 'Otro'] },
      { id: 'estudios', nombre: 'Estudios', valor: p => p.perfil.estudios || null, orden: ['STEM', 'No STEM', 'Otro'] },
      { id: 'videojuegos', nombre: 'Videojuegos 3D', valor: p => { const v = num0(p.perfil.experiencia_3d); return v === null ? null : v === 0 ? 'Nunca' : v === 1 ? 'Rara vez' : 'Al menos alguna vez al mes'; }, orden: ['Nunca', 'Rara vez', 'Al menos alguna vez al mes'] },
      { id: 'estrategia', nombre: 'Estrategia (cuestionario)', valor: p => ({ girar_figura: 'Girar la figura entera', comparar_brazos: 'Comparar brazos sueltos', mixta: 'Mixta', otra: 'Otra' })[p.perfil.estrategia] || null, orden: ['Girar la figura entera', 'Mixta', 'Comparar brazos sueltos', 'Otra'] },
      { id: 'dispositivo', nombre: 'Dispositivo', valor: p => ({ movil: 'Móvil', ordenador: 'Ordenador', tablet: 'Tableta' })[p.dispositivo] || null, orden: ['Móvil', 'Ordenador', 'Tableta'] }
    ];
    const med = MEDIDAS[medidaDif] || MEDIDAS.prec;
    A.dif = {
      medidas: MEDIDAS, med, vars: VARS.map(v => {
        const grupos = v.orden.map(nombre => {
          const g = L.filter(p => v.valor(p) === nombre), vals = limpio(g.map(med.f));
          return { nombre, n: vals.length, y: media(vals), ee: eeDe(vals), vals };
        }).filter(g => g.n >= 3);   // grupos de 1-2 personas: no se muestran (poco fiables e identificables)
        const grandes = grupos.sort((a, b) => b.n - a.n).slice(0, 2);
        return Object.assign({}, v, { grupos, w: grandes.length === 2 ? Object.assign(welch(grandes[0].vals, grandes[1].vals) || {}, { a: grandes[0].nombre, b: grandes[1].nombre }) : null });
      }),
      corr: [
        ['Edad', p => num0(p.perfil.edad)], ['Videojuegos 3D (0-4)', p => num0(p.perfil.experiencia_3d)],
        ['Dificultad percibida (1-5)', p => num0(p.perfil.dificultad)], ['Concentración (1-5)', p => num0(p.perfil.concentracion)],
        ['Cansancio (1-5)', p => num0(p.perfil.fatiga)]
      ].map(([nombre, f]) => ({ nombre, f, r: spearman(L.map(f), L.map(med.f)) }))
    };
    return A;
  }

  /* =================== veredictos de las hipótesis =================== */
  const V = {
    bien: (t) => ({ clase: 'bien', icono: '✓', texto: t }), medio: (t) => ({ clase: 'medio', icono: '◐', texto: t }),
    mal: (t) => ({ clase: 'mal', icono: '✗', texto: t }), neutro: (t) => ({ clase: 'neutro', icono: '…', texto: t })
  };
  const badge = (v) => v ? `<span class="veredicto ${v.clase}">${v.icono} ${esc(v.texto)}</span>` : '';

  function hipotesis(A) {
    const { h1, h2, h7, angulos } = A;
    const a0 = angulos[0], aN = angulos[angulos.length - 1];
    const out = [];
    // H1
    let v1 = V.neutro('Sin datos'), r1 = 'Faltan datos del test normal.';
    if (h1.pend) {
      const baja = h1.curvaPrec[h1.curvaPrec.length - 1] < h1.curvaPrec[0];
      v1 = sig(h1.pend) && h1.pend.m > 0 && sig(h1.anovaPrec) && baja ? V.bien('Se cumple') : sig(h1.pend) && h1.pend.m > 0 ? V.medio('En parte') : V.mal('No se cumple');
      r1 = `TR de ${seg(h1.curva[0])} a ${a0}° a ${seg(h1.curva[h1.curva.length - 1])} a ${aN}° (${num(h1.pend.m, 1)} ms/°, ${fp(h1.pend.p)}; R² = ${num(h1.r2, 2)}); precisión de ${pct(h1.curvaPrec[0])} a ${pct(h1.curvaPrec[h1.curvaPrec.length - 1])}.`;
    }
    out.push({ id: 'h1', h: 'H1', esperado: 'En las personas, el TR crece de forma lineal con el ángulo y la precisión baja.', r: r1, v: v1 });
    // H2
    let v2 = V.neutro('Sin datos'), r2 = 'Faltan personas con los dos tests.';
    if (h2.prec && h2.tr) {
      const bajaPrec = h2.prec.m < 0 && sig(h2.prec), subeTr = h2.tr.m > 0 && sig(h2.tr), bajaTr = h2.tr.m < 0 && sig(h2.tr);
      v2 = bajaPrec && subeTr ? V.bien('Se cumple') : bajaTr ? V.mal('No: se responde más rápido') : bajaPrec || subeTr ? V.medio('En parte') : V.medio('No concluyente');
      r2 = `Precisión ${signo(h2.prec.m, x => pp(x))} (${fp(h2.prec.p)}); TR ${signo(h2.tr.m, ms)} (${fp(h2.tr.p)}); interacción con el ángulo ${h2.inter ? fp(h2.inter.p) : '—'}; n = ${h2.n}.`;
    }
    out.push({ id: 'h2', h: 'H2', esperado: 'La distracción baja la precisión y sube el TR, sobre todo en los giros grandes.', r: r2, v: v2 });
    // H3–H5 (modelos generalistas por chat)
    const chat = A.ia.chat;
    const pers3 = media(A.ia.humanosIA('sin_limite').map(p => p.tests.sin_limite.prec));
    if (chat.length) {
      const tot = chat.map(a => [a, A.ia.ia[a].sin_limite && A.ia.ia[a].sin_limite.total]).filter(x => esNum(x[1]));
      const peores = tot.filter(x => x[1] < pers3).length;
      out.push({ id: 'ia', h: 'H3', esperado: 'Las personas superan a los modelos generalistas, que quedan cerca del azar.', r: `Personas ${pct(pers3, 1)} en 3D; ${tot.map(([a, t]) => `${esc(a)} ${pct(t, 1)}`).join(', ')}.`, v: peores === tot.length ? V.bien('Se cumple') : peores ? V.medio('En parte') : V.mal('No se cumple') });
      out.push({ id: 'ia', h: 'H4', esperado: 'Los modelos nuevos superan a los antiguos y los razonadores a los rápidos.', r: 'Comparad los modelos en el gráfico «Precisión por agente» según su generación y si razonan.', v: V.neutro('Ver gráfico') });
    } else {
      out.push({ id: 'ia', h: 'H3', esperado: 'Las personas superan a los modelos generalistas, que quedan cerca del azar.', r: 'Pendiente de pasar el test por chat a los modelos generalistas (test_chat_ia/).', v: V.neutro('Faltan datos') });
      out.push({ id: 'ia', h: 'H4', esperado: 'Los modelos nuevos superan a los antiguos y los razonadores a los rápidos.', r: 'Pendiente de los modelos por chat.', v: V.neutro('Faltan datos') });
    }
    out.push({ id: 'ia', h: 'H5', esperado: 'En los modelos que razonan, los tokens de razonamiento aumentan con el ángulo.', r: 'Por chat no se ven los tokens ni la latencia; solo se podría aproximar con la longitud del razonamiento.', v: V.neutro('No medible por chat') });
    // H6
    const ia9 = A.ia.ia['IA-9'] && A.ia.ia['IA-9'].sin_limite;
    let v6 = V.neutro('Faltan datos'), r6 = 'Carga ia9_3d.csv (modelo_siames/resultados).';
    if (ia9) {
      const vals = [...ia9.porA.values()].map(x => x.y), infs = [...ia9.inf.values()];
      const plano = Math.max(...vals) - Math.min(...vals) <= 0.05, tiempoPlano = infs.length >= 2 && Math.max(...infs) / Math.min(...infs) < 1.25;
      const superaChat = chat.length && chat.every(a => !A.ia.ia[a].sin_limite || A.ia.ia[a].sin_limite.total < ia9.total);
      v6 = plano && tiempoPlano ? (chat.length ? (superaChat ? V.bien('Se cumple') : V.medio('En parte')) : V.medio('Se cumple lo medido')) : V.mal('No se cumple');
      r6 = `IA-9: ${pct(ia9.total, 1)} en 3D, de ${pct(Math.min(...vals))} a ${pct(Math.max(...vals))} según el ángulo; tiempo de cálculo ${infs.length ? `de ${num(Math.min(...infs), 2)} a ${num(Math.max(...infs), 2)} ms por par` : 'sin datos'}.${chat.length ? '' : ' Falta compararla con los generalistas.'}`;
    }
    out.push({ id: 'ia', h: 'H6', esperado: 'La red entrenada supera a los generalistas y su tiempo de cálculo no depende del ángulo.', r: r6, v: v6 });
    // H7
    let v7 = V.neutro('Sin datos'), r7 = 'Faltan personas con el test normal y el 2D.';
    if (h7.tr && h7.pend2) {
      const ok = sig(h7.pend2) && h7.pend2.m > 0 && h7.tr.m < 0 && sig(h7.tr) && h7.pend.m < 0 && sig(h7.pend);
      v7 = ok ? V.bien(chat.length ? 'Se cumple' : 'Se cumple en personas') : (sig(h7.pend2) ? V.medio('En parte') : V.mal('No se cumple'));
      const ia9_2 = A.ia.ia['IA-9'] && A.ia.ia['IA-9'].control_2d;
      r7 = `Personas: TR 2D ${signo(h7.tr.m, ms)} (${fp(h7.tr.p)}); pendiente ${num(h7.pend2m, 1)} frente a ${num(h7.pend3, 1)} ms/° (${fp(h7.pend.p)}), pero > 0 (${fp(h7.pend2.p)}).` +
        (ia9_2 && ia9 ? ` IA-9 (solo 3D): ${pct(ia9_2.total, 1)} en 2D frente a ${pct(ia9.total, 1)} en 3D.` : '');
    }
    out.push({ id: 'h7', h: 'H7', esperado: 'Personas: efecto del ángulo también en 2D, más rápido y con menos pendiente. IA: mejor en 2D; menos distancia con las personas.', r: r7, v: v7 });
    // Orden (control)
    const difs = A.orden.filter(x => x.wPrec).map(x => [x.c, x.wPrec.m]);
    if (difs.length) {
      const pos = difs.filter(d => d[1] > 0).length;
      out.push({ id: 'orden', h: 'Orden', esperado: 'Control: la práctica mejora el test que se hace después (por eso el orden se contrabalancea).',
        r: difs.map(([c, d]) => `${NOMBRE[c]} ${signo(d, x => pp(x, 0))}`).join(' · ') + ' (después − en 1.er lugar).',
        v: pos === difs.length ? V.bien('Hay práctica') : pos ? V.medio('Práctica y cansancio') : V.mal('Peor al final') });
    }
    return out;
  }

  /* =================== posibles explicaciones (para la discusión) =================== */
  function discusionH1(A) {
    const { h1, angulos } = A, d = [];
    if (!h1.pend) return d;
    const aN = angulos[angulos.length - 1];
    d.push(h1.r2 >= 0.9
      ? `Cada grado de giro añade unos <b>${num(h1.pend.m, 0)} ms</b> y la recta encaja muy bien (R² = ${num(h1.r2, 2)} con las medias). Es el patrón lineal de Shepard y Metzler (1971): se interpreta como un giro mental analógico, paso a paso, como si se girara un objeto real.`
      : `El TR sube con el ángulo (${num(h1.pend.m, 0)} ms/°), aunque no del todo en línea recta (R² = ${num(h1.r2, 2)}): quizá en los giros grandes se cambie de estrategia.`);
    if (h1.velocidad) d.push(`Velocidad de giro ≈ <b>${num(h1.velocidad, 0)} °/s</b>, más lenta que en el experimento original (unos 60 °/s). Allí había 8 personas muy entrenadas, con cientos de pares cada una; aquí, gente sin práctica, muchos con el móvil (figuras pequeñas) y un giro fijo de 15° en profundidad que obliga a interpretar la figura.`);
    if (h1.curvaPrec[h1.curvaPrec.length - 1] < h1.curvaPrec[0]) d.push(`La precisión también cae con el giro (de ${pct(h1.curvaPrec[0])} a ${pct(h1.curvaPrec[h1.curvaPrec.length - 1])} a ${aN}°): con giros grandes la imagen mental se degrada, o la persona responde antes de terminar de girar (intercambio velocidad-precisión).`);
    const conN = A.incluidos.filter(p => p.tests.sin_limite);
    const pI = media(conN.map(p => p.tests.sin_limite.porA[aN].precI)), pE = media(conN.map(p => p.tests.sin_limite.porA[aN].precE));
    if (esNum(pI) && esNum(pE) && pE - pI > 0.05) d.push(`A ${aN}° fallan sobre todo los pares «igual» (${pct(pI)} de aciertos) y no tanto los espejo (${pct(pE)}): ante la duda se responde «espejo». Tiene sentido si no se consigue completar el giro: si la figura no encaja, «parece» su imagen en espejo.`);
    if (h1.espejo && h1.espejo.m > 0) d.push(`Los pares espejo tardan ${ms(h1.espejo.m)} más que los iguales (${fp(h1.espejo.p)}): para decir «espejo» hay que girar y además comprobar que no encaja; se decide por descarte.`);
    return d;
  }
  function discusionH7(A) {
    const h = A.h7, d = [];
    if (!h.tr) return d;
    if (h.tr.m < 0) d.push(`Con figuras planas se responde <b>${seg(-h.tr.m)} antes</b> y la pendiente baja a ${num(h.pend2m, 0)} ms/° (frente a ${num(h.pend3, 0)} en 3D). Sin profundidad no hay que reconstruir la forma tridimensional a partir del dibujo ni imaginar los cubos que se tapan.`);
    if (h.pend2 && h.pend2.m > 0 && sig(h.pend2)) d.push(`Aun así, el ángulo sigue costando en 2D (${fp(h.pend2.p)}): la dificultad del 3D se suma a la del giro, no la sustituye. Coincide con Cooper y Shepard (1973), que encontraron el mismo efecto con letras.`);
    if (esNum(h.fa2) && esNum(h.fa3) && h.fa2 > h.fa3) d.push(`En 2D se responde «igual» a más pares espejo (${pct(h.fa2)} frente a ${pct(h.fa3)} en 3D${h.fa ? `, ${fp(h.fa.p)}` : ''}). Una figura plana se puede «dar la vuelta» como una pieza de papel, así que su imagen en espejo puede parecer la misma figura: la consigna es más ambigua en 2D. Puede explicar los pocos tests 2D al azar.`);
    if (h.prec && !sig(h.prec)) d.push(`La precisión es parecida en 2D y en 3D (${signo(h.prec.m, x => pp(x))}, ${fp(h.prec.p)}): las dos están cerca del techo, así que la diferencia se ve sobre todo en el tiempo.`);
    return d;
  }
  function discusionH2(A) {
    const h = A.h2, d = [], aN = A.angulos[A.angulos.length - 1];
    if (!h.tr) return d;
    if (h.tr.m < 0) d.push(`Con distracción se responde <b>${ms(-h.tr.m)} más rápido</b> (${fp(h.tr.p)}), no más lento. Parece un <b>intercambio velocidad-precisión</b>: los pitidos y las formas son molestos y la gente se apresura para acabar antes, a costa de algunos errores.`);
    else if (sig(h.tr)) d.push(`La distracción alarga el TR ${ms(h.tr.m)} (${fp(h.tr.p)}): compite por la atención y la memoria de trabajo que hacen falta para girar la figura.`);
    const peor = h.porA.filter(x => esNum(x.d)).sort((a, b) => a.d - b.d)[0];
    if (h.prec) d.push(`La precisión cambia ${signo(h.prec.m, x => pp(x))} (${fp(h.prec.p)})${peor && peor.d < 0 ? `; la caída mayor es a ${peor.a}° (${signo(peor.d, x => pp(x, 0))})${peor.a === aN ? ', los giros que más cargan la memoria de trabajo' : ''}` : ''}.`);
    if (h.ordenW && esNum(h.distPrimero) && esNum(h.distDespues)) d.push(`El efecto depende del orden: quien empezó por la distracción acertó un <b>${pct(h.distPrimero)}</b> en ese test; quien ya había hecho otro antes, un <b>${pct(h.distDespues)}</b> (interacción condición × orden, ${fp(h.ordenW.p)}). La práctica protege: con la tarea ya aprendida, la distracción quita menos recursos.`);
    d.push(`Limitaciones: online no se controla el volumen ni el entorno${h.sinSonido ? `; ${h.sinSonido} persona(s) no oyeron los pitidos` : ''}; y todos los pares llevan distracción, así que no se puede comparar dentro del mismo test.`);
    return d;
  }
  function discusionOrden(A) {
    const d = [], dur = mediana(A.muestra.duracion);
    const por = Object.fromEntries(A.orden.map(x => [x.c, x]));
    const di = por.distraccion && por.distraccion.wPrec;
    if (di && di.m > 0) d.push(`El test con distracción mejora mucho si no es el primero (${signo(di.m, x => pp(x))}, ${fp(di.p)}): aprender la tarea con pitidos y formas a la vez es más difícil; con práctica previa, la distracción molesta menos.`);
    const peores = ['sin_limite', 'control_2d'].filter(c => por[c] && por[c].wPrec && por[c].wPrec.m < 0);
    if (peores.length) d.push(`${peores.map(c => NOMBRE[c]).join(' y ')} salen peor al final (${peores.map(c => signo(por[c].wPrec.m, x => pp(x))).join(' y ')}): en una sesión online${esNum(dur) ? ` de ~${num(dur, 0)} min` : ''} aparecen cansancio y prisa (también se responde más rápido). Es un efecto de fatiga, contrario al de práctica.`);
    d.push(`Como el orden está contrabalanceado, estos efectos se reparten entre los tests: no sesgan las comparaciones dentro de cada persona, pero añaden ruido. Ojo: son comparaciones entre personas distintas, con unas ${num(media(A.orden.flatMap(x => x.porPos.map(q => q.n)).filter(n => n > 0)), 0)} por posición.`);
    return d;
  }
  function discusionIA(A) {
    const d = [], { ia, chat } = A.ia, ang = A.angulos;
    const pers = A.incluidos.filter(p => p.tests.sin_limite);
    const ia9 = ia['IA-9'] && ia['IA-9'].sin_limite, ia9_2 = ia['IA-9'] && ia['IA-9'].control_2d, mix2 = ia['IA-9mix'] && ia['IA-9mix'].control_2d;
    if (ia9) {
      const vals = [...ia9.porA.values()].map(x => x.y), infs = [...ia9.inf.values()];
      const p0 = media(pers.map(p => p.tests.sin_limite.porA[ang[0]].prec)), pN = media(pers.map(p => p.tests.sin_limite.porA[ang[ang.length - 1]].prec));
      d.push(`IA-9 acierta el <b>${pct(ia9.total, 1)}</b> en 3D y casi igual en todos los ángulos (de ${pct(Math.min(...vals))} a ${pct(Math.max(...vals))}), mientras que las personas bajan de ${pct(p0)} a ${pct(pN)}. ${infs.length ? `Su tiempo de cálculo es el mismo para cualquier giro (${num(Math.min(...infs), 2)}–${num(Math.max(...infs), 2)} ms): ` : ''}compara rasgos aprendidos de una vez, sin nada parecido a girar la figura (H6).`);
      const iguales = pers.filter(p => p.tests.sin_limite.prec >= ia9.total - 1e-9).length;
      d.push(`Solo ${iguales} de ${pers.length} personas igualan a IA-9 en 3D. Pero es un sistema especializado, entrenado con miles de pares, frente a personas que ven la tarea por primera vez y que además sabrían hacer otras mil cosas.`);
    }
    if (ia9_2) {
      const p2 = A.incluidos.filter(p => p.tests.control_2d);
      const mejores = p2.filter(p => p.tests.control_2d.prec > ia9_2.total).length;
      d.push(`Entrenada solo con cubos, IA-9 baja al <b>${pct(ia9_2.total, 1)}</b> con figuras planas: la superan ${mejores} de ${p2.length} personas. No generaliza a un formato nuevo, y las personas sí, sin entrenamiento.${mix2 ? ` Entrenada con los dos formatos (IA-9mix) llega al ${pct(mix2.total, 1)}: el límite era el entrenamiento, no la tarea.` : ''}`);
    }
    if (!chat.length) d.push('Faltan los modelos generalistas por chat (H3–H5). Si quedan cerca del azar, como predice H3, tendremos los dos extremos: IA especializada por encima de las personas y generalista por debajo.');
    else d.push(`Modelos por chat: ${chat.map(a => `${esc(a)} ${pct(ia[a].sin_limite && ia[a].sin_limite.total, 1)}`).join(', ')} en 3D.`);
    return d;
  }
  function discusionDif(A) {
    const d = [], { vars, corr, med } = A.dif;
    const fmtD = (x) => med.escala === 'pct' ? signo(x, v => pp(v)) : med.escala === 'ms' ? signo(x, ms) : signo(x, v => num(v, 1) + ' ms/°');
    for (const v of vars) {
      if (!v.w || !esNum(v.w.m)) continue;
      const extra = v.id === 'genero' ? ' En la literatura, la diferencia a favor de los hombres es de las más estables en rotación mental (Voyer et al., 1995); aquí la muestra es pequeña.'
        : v.id === 'estrategia' ? ' Girar la figura entera es la estrategia «holística» que supone el modelo de rotación mental; comparar brazos sueltos es analítica, por partes.' : '';
      d.push(`${esc(v.nombre)}: ${esc(v.w.a)} frente a ${esc(v.w.b)}, ${fmtD(v.w.m)} (${fp(v.w.p)}).${extra}`);
    }
    const vj = corr.find(c => c.nombre.startsWith('Videojuegos'));
    if (vj && vj.r) d.push(`Videojuegos 3D y ${med.nombre.toLowerCase()}: ρ = ${num(vj.r.r, 2)} (${fp(vj.r.p)}). Jugar a videojuegos de acción mejora la rotación mental (Feng et al., 2007).`);
    d.push(`Con ${A.incluidos.length} personas y grupos desiguales, son tendencias para comentar, no conclusiones: casi ninguna diferencia entre grupos tendría potencia suficiente.`);
    return d;
  }

  /* =================== pintar =================== */
  const dibujados = new Map();
  let esperaRedibujo = null;
  window.addEventListener('resize', () => {
    clearTimeout(esperaRedibujo);
    esperaRedibujo = setTimeout(() => dibujados.forEach((x, cont) => { if (document.body.contains(cont)) x.f(cont, x.op); }), 150);
  });

  const SECCIONES = [['sec-resumen', 'Resumen'], ['sec-muestra', 'Muestra'], ['sec-h1', 'H1 · Ángulo'], ['sec-h7', 'H7 · 2D frente a 3D'],
    ['sec-h2', 'H2 · Distracción'], ['sec-orden', 'Orden y práctica'], ['sec-ia', 'H3–H6 · Personas frente a IA'],
    ['sec-dif', 'Diferencias individuales'], ['sec-part', 'Participantes']];

  function seccion(id, titulo, pregunta, v, cuerpo) {
    return `<div class="tarjeta ancha seccion" id="${id}"><header><h2>${titulo}</h2>${badge(v)}</header>${pregunta ? `<p class="pregunta">${pregunta}</p>` : ''}${cuerpo}</div>`;
  }
  const rejilla = (...ids) => `<div class="rejilla-graficos">${ids.map(id => `<div class="grafico" id="${id}"></div>`).join('')}</div>`;
  const cajas = (datos, discusion) => `<div class="claves"><div class="caja-datos"><h4>Datos clave</h4><ul>${datos.filter(Boolean).map(x => `<li>${x}</li>`).join('') || '<li>Sin datos suficientes.</li>'}</ul></div>` +
    (discusion && discusion.length ? `<div class="caja-discusion"><h4>Para la discusión: posibles explicaciones</h4><ul>${discusion.map(x => `<li>${x}</li>`).join('')}</ul></div>` : '') + '</div>';
  const baldosas = (lista) => `<div class="baldosas">${lista.map(([v, t]) => `<div class="baldosa"><div class="v">${v}</div><div class="t">${t}</div></div>`).join('')}</div>`;

  function recalcular() {
    if (!filas.length) { $('secciones').innerHTML = ''; return; }
    const A = analizar();
    const H = hipotesis(A);
    const vDe = (id) => (H.find(h => h.h === id) || {}).v;
    dibujados.clear();
    const { h1, h2, h7, angulos } = A;
    const L = A.incluidos;
    const aN = angulos[angulos.length - 1];
    const fmtGrado = (x) => x + '°';

    $('nav-secciones').innerHTML = SECCIONES.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('');

    // ---------- resumen ----------
    const dur = mediana(A.muestra.duracion);
    let html = seccion('sec-resumen', 'Resumen de las hipótesis', 'Veredictos automáticos con los datos y criterios actuales (contrastes con p < 0,05). Son un punto de partida para la discusión: revisadlos con los gráficos de cada apartado.', null,
      baldosas([
        [L.length, `personas analizadas (de ${A.conDatos} con datos)`],
        [pct(media(L.map(p => p.tests.sin_limite && p.tests.sin_limite.prec)), 1), 'precisión media en el test normal'],
        [h1.pend ? num(h1.pend.m, 1) : '—', 'ms más por cada grado de giro'],
        [h1.velocidad ? num(h1.velocidad, 0) + ' °/s' : '—', 'velocidad de giro mental'],
        [esNum(dur) ? num(dur, 1) + ' min' : '—', 'duración mediana de la sesión'],
        [A.ia.agentes.length, 'modelos de IA cargados']
      ]) +
      `<div class="tabla-scroll"><table class="tabla tabla-hip"><tr><th>Hipótesis</th><th>Qué esperábamos</th><th>Qué sale</th><th>Veredicto</th></tr>` +
      H.map(x => `<tr><td><a href="#sec-${x.id}">${x.h}</a></td><td>${esc(x.esperado)}</td><td>${x.r}</td><td>${badge(x.v)}</td></tr>`).join('') + '</table></div>');

    // ---------- muestra ----------
    const M = A.muestra;
    const maxE = Math.max(1, ...M.embudo.map(e => e[1]));
    const maxO = Math.max(1, ...M.ordenes.map(e => e[1]));
    const excl = A.personas.filter(p => p.motivo);
    const conteo = (f, orden) => { const m = new Map(); L.forEach(p => { const v = f(p); if (v) m.set(v, (m.get(v) || 0) + 1); }); return [...m.entries()].sort((a, b) => (orden ? orden.indexOf(a[0]) - orden.indexOf(b[0]) : b[1] - a[1])).map(([k, n]) => `${esc(k)} ${n}`).join(' · ') || '—'; };
    html += seccion('sec-muestra', 'Muestra y calidad de los datos', 'Quién ha participado, a quién se ha excluido y por qué (criterios fijados antes de ver los resultados).', null,
      `<div class="claves"><div><h4 style="margin:0 0 8px">Del total a la muestra analizada</h4><div class="barras-h">` +
      M.embudo.map(([t, n]) => `<div>${esc(t)}</div><div class="pista"><div class="lleno" style="width:${100 * n / maxE}%"></div></div><div class="n">${n}</div>`).join('') +
      `</div></div><div><h4 style="margin:0 0 8px">Orden de los tests (contrabalanceo)</h4><div class="barras-h">` +
      M.ordenes.map(([o, n]) => `<div>${esc(MR.nombreOrden(o))}</div><div class="pista"><div class="lleno" style="width:${100 * n / maxO}%;background:var(--suave)"></div></div><div class="n">${n}</div>`).join('') + `</div></div></div>` +
      cajas([
        `Edad: mediana ${num(mediana(M.edad), 0)} años (de ${num(Math.min(...M.edad), 0)} a ${num(Math.max(...M.edad), 0)}).`,
        `Género: ${conteo(p => ({ Hombre: 'hombres', Mujer: 'mujeres' })[p.perfil.genero] || (p.perfil.genero ? 'otro' : ''))}. Estudios: ${conteo(p => p.perfil.estudios)}.`,
        `Dispositivo: ${conteo(p => ({ movil: 'móvil', ordenador: 'ordenador', tablet: 'tableta' })[p.dispositivo])}. Modalidad: ${conteo(p => p.modalidad)}.`,
        esNum(dur) ? `Duración de la sesión: mediana ${num(dur, 1)} min.${M.descansos.length ? ` Descansos entre tests: mediana ${num(mediana(M.descansos), 1)} s.` : ''}` : '',
        `Pares quitados por TR fuera de 0,3–20 s: ${M.fuera} de ${M.paresL} (${pct(M.fuera / Math.max(1, M.paresL), 1)}).`
      ], [
        M.rapidos ? `Hubo <b>${M.rapidos}</b> respuestas en menos de 0,3 s, imposibles para esta tarea (contando también a los excluidos): aciertan un ${pct(M.precRapidos)}, lo mismo que al azar. ${M.rapidosMovil / M.rapidos > 0.8 ? `El ${pct(M.rapidosMovil / M.rapidos)} son con el móvil: personas que tocaban sin mirar para acabar antes.` : 'Son personas que respondían sin mirar para acabar antes.'}` : '',
        `Se excluye a ${excl.length} persona(s): ${[[1, 'no terminar el test normal'], [2, 'precisión baja'], [3, 'responder sin mirar']].map(([k, t]) => `${excl.filter(p => p.paso === k).length} por ${t}`).join(', ')}.`,
        'Es una muestra de conveniencia (conocidos del grupo, online): no es representativa de la población, y hay más variedad de dispositivos y entornos que en un laboratorio.'
      ].filter(Boolean)) +
      (excl.length ? `<details class="tabla-datos" style="margin-top:10px"><summary>Ver a quién se excluye y por qué (${excl.length})</summary><ul style="font-size:.86rem">${excl.map(p => `<li>${esc(p.sujeto)}: ${esc(p.motivo)}</li>`).join('')}</ul></details>` : ''));

    // ---------- H1 ----------
    html += seccion('sec-h1', 'H1 · Efecto del ángulo de giro', `¿Tardan más las personas cuanto más girada está la figura? (test normal, ${h1.n} personas; aciertos en pares «igual» para el TR, como en Shepard y Metzler, 1971)`, vDe('H1'),
      rejilla('g-h1-tr', 'g-h1-prec', 'g-h1-pend') +
      cajas(h1.pend ? [
        `TR por ángulo: ${angulos.map((a, i) => `${a}° ${seg(h1.curva[i])}`).join(' · ')}. ANOVA de medidas repetidas: ${fTexto(h1.anovaTr)}.`,
        `Pendiente media <b>${num(h1.pend.m, 1)} ms/°</b> ± ${num(h1.pend.e, 1)} (IC 95 % ${num(h1.pend.m - h1.pend.ic, 1)} a ${num(h1.pend.m + h1.pend.ic, 1)}), ${tTexto(h1.pend)}; positiva en ${h1.positivas.filter(x => x > 0).length} de ${h1.positivas.length} personas.`,
        `Ajuste lineal de las medias: R² = ${num(h1.r2, 3)}. Velocidad de giro ≈ ${num(h1.velocidad, 0)} °/s.`,
        `Precisión por ángulo: ${angulos.map((a, i) => `${a}° ${pct(h1.curvaPrec[i])}`).join(' · ')}. ${fTexto(h1.anovaPrec)}.`,
        h1.espejo ? `Pares espejo frente a iguales (TR de aciertos): ${signo(h1.espejo.m, ms)}, ${tTexto(h1.espejo)}.` : ''
      ] : [], discusionH1(A)));

    // ---------- H7 ----------
    html += seccion('sec-h7', 'H7 · Figuras planas (2D) frente a cubos (3D)', `¿La dificultad está en la tridimensionalidad o en el giro? Las mismas ${h7.n} personas con las dos versiones del test.`, vDe('H7'),
      rejilla('g-h7-tr', 'g-h7-prec', 'g-h7-pend') +
      cajas(h7.tr ? [
        `TR mediano 2D − 3D: <b>${signo(h7.tr.m, ms)}</b> ± ${ms(h7.tr.e)}, ${tTexto(h7.tr)}.`,
        `Pendiente: ${num(h7.pend2m, 1)} ms/° en 2D frente a ${num(h7.pend3, 1)} en 3D (${signo(h7.pend.m, x => num(x, 1))} ms/°), ${tTexto(h7.pend)}.`,
        `Efecto del ángulo en 2D: pendiente > 0, ${tTexto(h7.pend2)}; ANOVA del TR en 2D: ${fTexto(h7.anova2)}.`,
        `Precisión 2D − 3D: ${signo(h7.prec.m, x => pp(x))}, ${tTexto(h7.prec)}.`,
        `Respuestas «igual» a pares espejo: ${pct(h7.fa2)} en 2D frente a ${pct(h7.fa3)} en 3D${h7.fa ? `, ${tTexto(h7.fa)}` : ''}.`
      ] : [], discusionH7(A)));

    // ---------- H2 ----------
    html += seccion('sec-h2', 'H2 · Efecto de la distracción', `¿Empeoran las personas con pitidos y formas de colores? Cada persona frente a sí misma (${h2.n} personas${A.o.sonido && h2.sinSonido ? `, sin las ${h2.sinSonido} que no oyeron los pitidos` : ''}).`, vDe('H2'),
      rejilla('g-h2-tr', 'g-h2-prec', 'g-h2-sat', 'g-h2-orden') +
      cajas(h2.tr ? [
        `Precisión con distracción − normal: <b>${signo(h2.prec.m, x => pp(x))}</b> ± ${pp(h2.prec.e)}, ${tTexto(h2.prec)}.`,
        `TR mediano: <b>${signo(h2.tr.m, ms)}</b> ± ${ms(h2.tr.e)}, ${tTexto(h2.tr)}.`,
        `Pendiente: ${signo(h2.pend && h2.pend.m, x => num(x, 1) + ' ms/°')}, ${tTexto(h2.pend)}.`,
        `Interacción condición × ángulo (TR): ${fTexto(h2.inter)}. Cambio de precisión por ángulo: ${h2.porA.map(x => `${x.a}° ${signo(x.d, v => pp(v, 0))}`).join(' · ')}.`,
        h2.ordenW ? `Según el orden: ${signo(h2.efNormalAntes, x => pp(x))} si el normal fue antes (n = ${h2.normalAntes.length}) y ${signo(h2.efDistAntes, x => pp(x))} si la distracción fue antes (n = ${h2.distAntes.length}); interacción condición × orden: t de Welch ${est(`${num(h2.ordenW.t, 2)}, ${fp(h2.ordenW.p)}`)}.` : ''
      ] : [], discusionH2(A)));

    // ---------- orden ----------
    html += seccion('sec-orden', 'Orden de los tests: práctica y cansancio', 'Cada test según la posición en que se hizo (personas distintas en cada posición; el orden se asignó al azar o por turnos).', vDe('Orden'),
      rejilla('g-orden-prec', 'g-orden-tr') +
      cajas(A.orden.filter(x => x.n).map(x => `${NOMBRE[x.c]}: ${x.porPos.map(q => `${q.k}.º ${pct(q.prec)} (n = ${q.n})`).join(' · ')}. Después − en 1.er lugar: ${x.wPrec ? `${signo(x.wPrec.m, v => pp(v))}, ${fp(x.wPrec.p)}` : '—'}; TR ${x.wTr ? `${signo(x.wTr.m, ms)}, ${fp(x.wTr.p)}` : '—'}.`), discusionOrden(A)));

    // ---------- IA ----------
    const tablaIA = A.ia.agentes.length ? '' : '<p class="vacio">No hay resultados de IA cargados: añade ia9_3d.csv, ia9_2d.csv, ia9mix_… (modelo_siames) o resultados_chat.csv.</p>';
    html += seccion('sec-ia', 'H3–H6 · Personas frente a IA', `Las mismas figuras para personas e IA. ${A.o.primero ? 'Personas: solo el test que hicieron en primer lugar, sin práctica previa (como la IA).' : 'Personas: todos los incluidos (activa «IA: solo el test que hicieron primero» para compararlas sin práctica previa).'}`, null,
      tablaIA + rejilla('g-ia-3d', 'g-ia-2d', 'g-ia-dist', 'g-ia-coste') +
      cajas(A.ia.agentes.map(ag => {
        const x = A.ia.ia[ag];
        return `${esc(ag)}: ${x.sin_limite ? `3D ${pct(x.sin_limite.total, 1)}` : ''}${x.sin_limite && x.control_2d ? ' · ' : ''}${x.control_2d ? `2D ${pct(x.control_2d.total, 1)}` : ''} (${(x.sin_limite || x.control_2d).reps} repeticiones o semillas).`;
      }).concat([`Personas: 3D ${pct(media(A.ia.humanosIA('sin_limite').map(p => p.tests.sin_limite.prec)), 1)} (n = ${A.ia.humanosIA('sin_limite').length}) · 2D ${pct(media(A.ia.humanosIA('control_2d').map(p => p.tests.control_2d.prec)), 1)} (n = ${A.ia.humanosIA('control_2d').length}).`]),
      discusionIA(A)));

    // ---------- diferencias individuales ----------
    html += seccion('sec-dif', 'Diferencias individuales y cuestionario', 'Exploratorio: ¿quién lo hace mejor? Datos generales y cuestionario final (hoja «sesiones»).', null,
      `<label class="medida-sel">Medida <select id="sel-medida">${Object.entries(A.dif.medidas).map(([k, m]) => `<option value="${k}" ${k === medidaDif ? 'selected' : ''}>${m.nombre}</option>`).join('')}</select></label>` +
      rejilla(...A.dif.vars.map(v => 'g-dif-' + v.id), 'g-dif-corr') +
      cajas(A.dif.corr.filter(c => c.r).map(c => `${c.nombre}: ρ de Spearman = ${num(c.r.r, 2)} (${fp(c.r.p)}, n = ${c.r.n}).`), discusionDif(A)));

    // ---------- participantes ----------
    html += seccion('sec-part', 'Participantes', '', null,
      `<details class="tabla-datos"><summary>Ver la tabla (${A.personas.length} personas)</summary><div class="tabla-scroll"><table class="tabla"><tr><th>Código</th><th>Estado</th><th>Modalidad</th><th>Dispositivo</th><th>Orden</th><th>Normal</th><th>Distracción</th><th>2D</th><th>Pendiente</th><th>Rápidas</th></tr>` +
      A.personas.slice().sort((a, b) => String(a.sujeto).localeCompare(String(b.sujeto), 'es', { numeric: true })).map(p => `<tr class="${p.motivo ? 'excluido' : ''}"><td>${esc(p.sujeto)}${p.simulado ? ' <span class="chip prueba">simulado</span>' : ''}</td><td>${p.motivo ? esc('excluido: ' + p.motivo) : 'incluido'}${p.alAzar.length ? ` · al azar en ${p.alAzar.map(c => CORTO[c]).join(', ')}` : ''}</td><td>${esc(p.modalidad)}</td><td>${esc(p.dispositivo)}</td><td>${esc(p.orden ? MR.nombreOrden(p.orden) : '')}</td>` +
        TESTS.map(c => `<td>${p.tests[c] ? pct(p.tests[c].prec) : '—'}</td>`).join('') + `<td>${p.tests.sin_limite && esNum(p.tests.sin_limite.pend) ? num(p.tests.sin_limite.pend, 1) + ' ms/°' : '—'}</td><td>${p.rapidos}</td></tr>`).join('') + '</table></div></details>');

    $('secciones').innerHTML = html;
    const sel = $('sel-medida');
    if (sel) sel.addEventListener('change', () => { medidaDif = sel.value; const y = window.scrollY; recalcular(); window.scrollTo(0, y); });

    // ---------- gráficos ----------
    const n1 = L.filter(p => p.tests.sin_limite);
    lineas($('g-h1-tr'), {
      titulo: 'Tiempo de respuesta por ángulo', sub: `Test normal · mediana de los aciertos de cada persona; media ± EE (n = ${n1.length})`,
      xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro', yMin: 0, formato: ms,
      series: [{ nombre: 'Pares «igual»', color: COLOR.sin_limite, puntos: serieA(n1, 'sin_limite', 'trI', angulos) },
               { nombre: 'Pares espejo', color: COLOR.sin_limite, discontinua: true, puntos: serieA(n1, 'sin_limite', 'trE', angulos) }]
    });
    lineas($('g-h1-prec'), {
      titulo: 'Precisión por ángulo', sub: `Test normal · media ± EE (n = ${n1.length})`, xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro',
      yMin: 0.4, yMax: 1, ticks: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], formato: (y) => pct(y), referencia: { y: 0.5, texto: 'azar' },
      series: [{ nombre: 'Pares «igual»', color: COLOR.sin_limite, puntos: serieA(n1, 'sin_limite', 'precI', angulos) },
               { nombre: 'Pares espejo', color: COLOR.sin_limite, discontinua: true, puntos: serieA(n1, 'sin_limite', 'precE', angulos) }]
    });
    tira($('g-h1-pend'), {
      titulo: 'Pendiente de cada persona (ms por grado)', sub: 'Un punto por persona; barra negra: media e IC 95 %. Por encima de 0 = tarda más cuanto más girada está la figura.',
      formato: (y) => num(y, 1) + ' ms/°', formatoEje: (y) => num(y, 0) + ' ms/°', referencias: [{ y: 0, texto: 'sin efecto del ángulo' }],
      grupos: TESTS.map(c => ({ nombre: NOMBRE[c], color: COLOR[c], valores: L.filter(p => p.tests[c] && esNum(p.tests[c].pend)).map(p => ({ v: p.tests[c].pend, etiqueta: p.sujeto })) }))
    });

    const p2 = h7.lista;
    lineas($('g-h7-tr'), {
      titulo: 'TR por ángulo: cubos frente a figuras planas', sub: `Mismas personas (n = ${p2.length}) · pares «igual», mediana de los aciertos; media ± EE`,
      xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro', yMin: 0, formato: ms,
      series: [{ nombre: 'Cubos (3D)', color: COLOR.sin_limite, puntos: serieA(p2, 'sin_limite', 'trI', angulos) },
               { nombre: 'Planas (2D)', color: COLOR.control_2d, puntos: serieA(p2, 'control_2d', 'trI', angulos) }]
    });
    lineas($('g-h7-prec'), {
      titulo: 'Precisión por ángulo: cubos frente a figuras planas', sub: `Mismas personas (n = ${p2.length}) · todos los pares; media ± EE`,
      xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro', yMin: 0.4, yMax: 1, ticks: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], formato: (y) => pct(y), referencia: { y: 0.5, texto: 'azar' },
      series: [{ nombre: 'Cubos (3D)', color: COLOR.sin_limite, puntos: serieA(p2, 'sin_limite', 'prec', angulos) },
               { nombre: 'Planas (2D)', color: COLOR.control_2d, puntos: serieA(p2, 'control_2d', 'prec', angulos) }]
    });
    dispersion($('g-h7-pend'), {
      titulo: 'Pendiente en 3D frente a 2D, persona a persona', sub: 'Por debajo de la diagonal: gira más deprisa las figuras planas que los cubos.',
      xTitulo: 'Pendiente en 3D (ms/°)', yTitulo: 'Pendiente en 2D (ms/°)', identidad: true, color: COLOR.control_2d,
      fx: (x) => num(x, 1) + ' ms/°', fy: (y) => num(y, 1) + ' ms/°', fxEje: (x) => num(x, 0), fyEje: (y) => num(y, 0),
      puntos: p2.filter(p => esNum(p.tests.sin_limite.pend) && esNum(p.tests.control_2d.pend)).map(p => ({ x: p.tests.sin_limite.pend, y: p.tests.control_2d.pend, etiqueta: p.sujeto }))
    });

    const pD = h2.lista;
    lineas($('g-h2-tr'), {
      titulo: 'TR por ángulo: normal frente a distracción', sub: `Mismas personas (n = ${pD.length}) · pares «igual», mediana de los aciertos; media ± EE`,
      xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro', yMin: 0, formato: ms,
      series: [{ nombre: 'Normal', color: COLOR.sin_limite, puntos: serieA(pD, 'sin_limite', 'trI', angulos) },
               { nombre: 'Con distracción', color: COLOR.distraccion, puntos: serieA(pD, 'distraccion', 'trI', angulos) }]
    });
    lineas($('g-h2-prec'), {
      titulo: 'Precisión por ángulo: normal frente a distracción', sub: `Mismas personas (n = ${pD.length}) · todos los pares; media ± EE`,
      xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro', yMin: 0.4, yMax: 1, ticks: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], formato: (y) => pct(y), referencia: { y: 0.5, texto: 'azar' },
      series: [{ nombre: 'Normal', color: COLOR.sin_limite, puntos: serieA(pD, 'sin_limite', 'prec', angulos) },
               { nombre: 'Con distracción', color: COLOR.distraccion, puntos: serieA(pD, 'distraccion', 'prec', angulos) }]
    });
    dispersion($('g-h2-sat'), {
      titulo: '¿Más rápido o más preciso? Cambio de cada persona con distracción', sub: 'Abajo a la izquierda: responde más rápido y acierta menos (intercambio velocidad-precisión).',
      xTitulo: 'Cambio de TR (distracción − normal)', yTitulo: 'Cambio de precisión', ceros: true, color: COLOR.distraccion,
      fx: (x) => signo(x, ms), fy: (y) => signo(y, v => pp(v)), fyEje: (y) => signo(y, v => pp(v, 0)),
      notas: [{ donde: 'abajo-izq', texto: 'más rápido, menos preciso' }, { donde: 'arriba-der', texto: 'más lento, más preciso' }],
      puntos: pD.filter(p => esNum(p.tests.distraccion.tr) && esNum(p.tests.sin_limite.tr)).map(p => ({ x: p.tests.distraccion.tr - p.tests.sin_limite.tr, y: p.tests.distraccion.prec - p.tests.sin_limite.prec, etiqueta: p.sujeto }))
    });
    const grupoOrden = (lista) => [
      { y: media(lista.map(p => p.tests.sin_limite.prec)), ee: eeDe(lista.map(p => p.tests.sin_limite.prec)), n: lista.length },
      { y: media(lista.map(p => p.tests.distraccion.prec)), ee: eeDe(lista.map(p => p.tests.distraccion.prec)), n: lista.length }];
    const gN = grupoOrden(h2.normalAntes || []), gD = grupoOrden(h2.distAntes || []);
    barras($('g-h2-orden'), {
      titulo: 'La distracción según el orden de los tests', sub: 'Precisión media ± EE de cada test, según cuál se hizo antes.',
      categorias: [`El normal antes\n(n = ${(h2.normalAntes || []).length})`, `La distracción antes\n(n = ${(h2.distAntes || []).length})`],
      yMax: 1, ticks: [0, 0.25, 0.5, 0.75, 1], formato: (y) => pct(y), referencia: { y: 0.5, texto: 'azar' },
      series: [{ nombre: 'Test normal', color: COLOR.sin_limite, valores: [gN[0], gD[0]] }, { nombre: 'Test con distracción', color: COLOR.distraccion, valores: [gN[1], gD[1]] }]
    });

    const posCat = ['1.er lugar', '2.º lugar', '3.er lugar'];
    barras($('g-orden-prec'), {
      titulo: 'Precisión según la posición del test', sub: 'Media ± EE; personas distintas en cada posición.', categorias: posCat,
      yMax: 1, ticks: [0, 0.25, 0.5, 0.75, 1], formato: (y) => pct(y), referencia: { y: 0.5, texto: 'azar' },
      series: A.orden.filter(x => x.n).map(x => ({ nombre: NOMBRE[x.c], color: COLOR[x.c], valores: x.porPos.map(q => q.n ? { y: q.prec, ee: q.precE, n: q.n } : null) }))
    });
    barras($('g-orden-tr'), {
      titulo: 'TR según la posición del test', sub: 'Mediana de los aciertos de cada persona; media ± EE.', categorias: posCat, formato: ms,
      series: A.orden.filter(x => x.n).map(x => ({ nombre: NOMBRE[x.c], color: COLOR[x.c], valores: x.porPos.map(q => q.n ? { y: q.tr, ee: q.trE, n: q.n } : null) }))
    });

    const seriesIA = (c) => {
      const hs = A.ia.humanosIA(c);
      const out = [{ nombre: `Personas (n = ${hs.length})`, color: COLOR_PERSONAS, puntos: serieA(hs, c, 'prec', angulos) }];
      A.ia.agentes.forEach(ag => { if (A.ia.ia[ag][c]) out.push({ nombre: ag, color: A.ia.colorAgente[ag], puntos: A.ia.ia[ag][c].porA }); });
      return out;
    };
    lineas($('g-ia-3d'), {
      titulo: 'Precisión por ángulo · figuras 3D', sub: 'Personas: media ± EE. IA: media de semillas o repeticiones.', xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro',
      yMin: 0.4, yMax: 1, ticks: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], formato: (y) => pct(y), referencia: { y: 0.5, texto: 'azar' }, series: seriesIA('sin_limite')
    });
    lineas($('g-ia-2d'), {
      titulo: 'Precisión por ángulo · figuras 2D', sub: 'Control 2D: los mismos 48 pares para personas e IA.', xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro',
      yMin: 0.4, yMax: 1, ticks: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], formato: (y) => pct(y), referencia: { y: 0.5, texto: 'azar' }, series: seriesIA('control_2d')
    });
    tira($('g-ia-dist'), {
      titulo: '¿Dónde queda cada IA entre las personas?', sub: 'Precisión de cada persona (puntos) y de cada IA (líneas). Pasa el ratón para ver el código.',
      formato: (y) => pct(y, 1), formatoEje: (y) => pct(y), yMin: 0.4, yMax: 1,
      referencias: [{ y: 0.5, texto: 'azar' }].concat(A.ia.agentes.flatMap(ag => ['sin_limite', 'control_2d'].filter(c => A.ia.ia[ag][c]).map(c => ({ y: A.ia.ia[ag][c].total, texto: ag, color: A.ia.colorAgente[ag], grupo: c === 'sin_limite' ? 0 : 1 })))),
      grupos: ['sin_limite', 'control_2d'].map(c => ({ nombre: c === 'sin_limite' ? 'Figuras 3D (test normal)' : 'Figuras 2D (control)', color: COLOR_PERSONAS, valores: A.ia.humanosIA(c).map(p => ({ v: p.tests[c].prec, etiqueta: p.sujeto })) }))
    });
    const coste = [{ nombre: `Personas: TR (n = ${n1.length})`, color: COLOR_PERSONAS, puntos: serieA(n1, 'sin_limite', 'trI', angulos, (v, p) => esNum(v) && esNum(p.tests.sin_limite.porA[angulos[0]].trI) ? v / p.tests.sin_limite.porA[angulos[0]].trI : null) }];
    A.ia.agentes.forEach(ag => {
      const x = A.ia.ia[ag].sin_limite;
      if (x && x.inf.size && esNum(x.inf.get(angulos[0]))) coste.push({ nombre: `${ag}: tiempo de cálculo`, color: A.ia.colorAgente[ag], puntos: new Map([...x.inf.entries()].map(([a, t]) => [a, { y: t / x.inf.get(angulos[0]), ee: null, n: x.reps }])) });
    });
    lineas($('g-ia-coste'), {
      titulo: 'Coste de procesamiento según el ángulo (3D)', sub: 'Relativo a 0° (1 = igual que sin giro). Personas: TR; IA: tiempo de cálculo por par.',
      xs: angulos, xFormato: fmtGrado, xTitulo: 'Ángulo de giro', yMin: 0, formato: (y) => '×' + num(y, 2), formatoEje: (y) => '×' + num(y, 0), series: coste
    });

    const med = A.dif.med;
    const escY = med.escala === 'pct' ? { yMax: 1, ticks: [0, 0.25, 0.5, 0.75, 1] } : {};
    A.dif.vars.forEach(v => {
      barras($('g-dif-' + v.id), Object.assign({
        titulo: v.nombre, sub: `${med.nombre} · media ± EE${v.w && esNum(v.w.p) ? ` · ${v.w.a} frente a ${v.w.b}: ${fp(v.w.p)}` : ''}`,
        categorias: v.grupos.map(g => `${g.nombre}\n(n = ${g.n})`), formato: med.fmt, formatoEje: med.eje,
        series: [{ nombre: med.nombre, color: COLOR_PERSONAS, valores: v.grupos.map(g => ({ y: g.y, ee: g.ee, n: g.n })) }]
      }, escY));
    });
    const edad = A.dif.corr[0];
    dispersion($('g-dif-corr'), {
      titulo: 'Edad', sub: `${med.nombre}${edad.r ? ` · ρ = ${num(edad.r.r, 2)} (${fp(edad.r.p)})` : ''}`, xTitulo: 'Edad (años)', yTitulo: med.nombre,
      color: COLOR_PERSONAS, recta: true, fx: (x) => num(x, 0) + ' años', fy: med.fmt,
      puntos: L.map(p => ({ x: edad.f(p), y: med.f(p), etiqueta: p.sujeto })).filter(q => esNum(q.x) && esNum(q.y) && q.x < 95)
    });
  }

  /* =================== gráficos (SVG) =================== */
  const anchoDe = (cont) => Math.round(Math.max(300, (cont.clientWidth || 560) - 34));
  function ticksBonitos(min, max, n = 5) {
    if (!(max > min)) max = min + 1;
    const paso0 = (max - min) / n, pot = Math.pow(10, Math.floor(Math.log10(paso0))), r = paso0 / pot;
    const paso = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * pot;
    const ts = []; for (let v = Math.floor(min / paso) * paso; v <= Math.ceil(max / paso) * paso + paso * 1e-9; v += paso) ts.push(+v.toFixed(10));
    return ts;
  }
  function leyendaHtml(series) {
    if (series.length < 2) return '';
    return `<div class="leyenda-viz">${series.map(s => `<span><svg viewBox="0 0 22 10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke="${s.color}" stroke-width="2" ${s.discontinua ? 'stroke-dasharray="4 3"' : ''}/><circle cx="11" cy="5" r="3.5" fill="${s.color}"/></svg>${esc(s.nombre)}</span>`).join('')}</div>`;
  }
  function montar(cont, op, f, svg, leyenda, tabla) {
    dibujados.set(cont, { f, op });
    cont.innerHTML = `<div class="g-cab"><div><h3>${esc(op.titulo)}</h3>${op.sub ? `<p class="sub">${esc(op.sub)}</p>` : ''}</div>${svg ? '<button type="button" class="btn-png" title="Descargar en PNG">PNG</button>' : ''}</div>` +
      (svg ? (leyenda || '') + svg + (tabla ? `<details class="tabla-datos"><summary>Ver tabla</summary><div class="tabla-scroll"><table class="tabla">${tabla}</table></div></details>` : '')
        : '<p class="vacio">Sin datos para este gráfico con los archivos y criterios actuales.</p>');
    const b = cont.querySelector('.btn-png');
    if (b) b.onclick = () => exportarPNG(cont, op);
  }
  const svgAbre = (W, H, titulo) => `<svg class="plot" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(titulo)}">`;
  function ejeY(ticks, Y, W, m, formato) {
    let s = '';
    for (const t of ticks) {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--grid)" stroke-width="1"/>`;
      s += `<text x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="11" fill="var(--text-muted)">${esc(formato(t))}</text>`;
    }
    return s;
  }
  function referencia(op, Y, W, m) {
    if (!op.referencia) return '';
    return `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(op.referencia.y)}" y2="${Y(op.referencia.y)}" stroke="var(--axis)" stroke-width="1.5" stroke-dasharray="5 4"/>` +
      `<text x="${W - m.r}" y="${Y(op.referencia.y) - 5}" text-anchor="end" font-size="11" fill="var(--text-muted)">${esc(op.referencia.texto)}</text>`;
  }

  // Líneas por ángulo (o por cualquier x numérica), con barras de error
  function lineas(cont, op) {
    if (!cont) return;
    const series = op.series.filter(s => s.puntos && s.puntos.size);
    if (!series.length) return montar(cont, op, lineas, null);
    const W = anchoDe(cont), H = op.alto || 270, m = { l: 60, r: 16, t: 14, b: 42 };
    const xs = op.xs, xMin = Math.min(...xs), xMax = Math.max(...xs), pad = 14;
    const X = (x) => m.l + pad + (xMax === xMin ? 0.5 : (x - xMin) / (xMax - xMin)) * (W - m.l - m.r - 2 * pad);
    const vals = series.flatMap(s => [...s.puntos.values()].flatMap(p => [p.y + (p.ee || 0), p.y - (p.ee || 0)]));
    let yMin = op.yMin !== undefined ? op.yMin : Math.min(...vals), yMax = op.yMax !== undefined ? op.yMax : Math.max(...vals) * 1.06;
    const ticks = op.ticks || ticksBonitos(yMin, yMax, 5);
    if (!op.ticks) { yMin = Math.min(yMin, ticks[0]); yMax = ticks[ticks.length - 1]; }
    const Y = (y) => H - m.b - (y - yMin) / (yMax - yMin) * (H - m.t - m.b);
    let s = svgAbre(W, H, op.titulo) + ejeY(ticks, Y, W, m, op.formatoEje || op.formato);
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(ticks[0])}" y2="${Y(ticks[0])}" stroke="var(--axis)" stroke-width="1"/>` + referencia(op, Y, W, m);
    for (const x of xs) s += `<text x="${X(x)}" y="${H - m.b + 18}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${esc(op.xFormato ? op.xFormato(x) : x)}</text>`;
    s += `<text x="${(m.l + W - m.r) / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${esc(op.xTitulo || '')}</text>`;
    for (const se of series) {
      const pts = xs.filter(x => se.puntos.has(x) && esNum(se.puntos.get(x).y)).map(x => [x, se.puntos.get(x)]);
      for (const [x, p] of pts) if (p.ee) s += `<line x1="${X(x)}" x2="${X(x)}" y1="${Y(Math.min(yMax, p.y + p.ee))}" y2="${Y(Math.max(yMin, p.y - p.ee))}" stroke="${se.color}" stroke-width="1.5" stroke-opacity=".55"/>`;
      s += `<polyline fill="none" stroke="${se.color}" stroke-width="2" ${se.discontinua ? 'stroke-dasharray="6 4"' : ''} stroke-linejoin="round" stroke-linecap="round" points="${pts.map(([x, p]) => `${X(x)},${Y(p.y)}`).join(' ')}"/>`;
      for (const [x, p] of pts) {
        s += `<circle cx="${X(x)}" cy="${Y(p.y)}" r="4.5" fill="${se.color}" stroke="var(--surface-1)" stroke-width="2"/>`;
        s += `<circle cx="${X(x)}" cy="${Y(p.y)}" r="12" fill="transparent" data-tip="${esc(`${se.nombre} · ${op.xFormato ? op.xFormato(x) : x}\n${op.formato(p.y)}${p.ee ? ' ± ' + op.formato(p.ee) : ''}${p.n ? ` (n = ${p.n})` : ''}`)}"/>`;
      }
    }
    s += '</svg>';
    const tabla = `<tr><th>Serie</th>${xs.map(x => `<th>${esc(op.xFormato ? op.xFormato(x) : x)}</th>`).join('')}</tr>` +
      series.map(se => `<tr><td>${esc(se.nombre)}</td>${xs.map(x => { const p = se.puntos.get(x); return `<td>${p && esNum(p.y) ? esc(op.formato(p.y)) + (p.ee ? ` ± ${esc(op.formato(p.ee))}` : '') + (p.n ? `<div class="nota">n = ${p.n}</div>` : '') : '—'}</td>`; }).join('')}</tr>`).join('');
    montar(cont, op, lineas, s, leyendaHtml(series), tabla);
  }

  // Barras agrupadas con error estándar (eje desde 0)
  function barras(cont, op) {
    if (!cont) return;
    const series = op.series.filter(se => se.valores.some(v => v && esNum(v.y)));
    if (!series.length || !op.categorias.length) return montar(cont, op, barras, null);
    const W = anchoDe(cont), H = op.alto || 260, m = { l: 60, r: 12, t: 14, b: 50 };
    const vals = series.flatMap(se => se.valores.filter(v => v && esNum(v.y)).map(v => v.y + (v.ee || 0)));
    const yMax0 = op.yMax !== undefined ? op.yMax : Math.max(...vals) * 1.08;
    const ticks = op.ticks || ticksBonitos(0, yMax0, 5), yMax = ticks[ticks.length - 1];
    const Y = (y) => H - m.b - y / yMax * (H - m.t - m.b);
    const nC = op.categorias.length, anchoG = (W - m.l - m.r) / nC, nS = series.length;
    const bw = Math.min(46, (anchoG * 0.72 - (nS - 1) * 2) / nS);
    let s = svgAbre(W, H, op.titulo) + ejeY(ticks, Y, W, m, op.formatoEje || op.formato);
    op.categorias.forEach((cat, i) => {
      const x0 = m.l + i * anchoG + (anchoG - (nS * bw + (nS - 1) * 2)) / 2;
      series.forEach((se, j) => {
        const v = se.valores[i]; if (!v || !esNum(v.y)) return;
        const x = x0 + j * (bw + 2), y = Y(v.y), yb = Y(0), r = Math.min(4, bw / 2, Math.max(0, yb - y));
        s += `<path d="M${x},${yb} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${yb} Z" fill="${se.color}" data-tip="${esc(`${se.nombre}\n${cat.replace(/\n/g, ' ')}: ${op.formato(v.y)}${v.ee ? ' ± ' + op.formato(v.ee) : ''}${v.n ? ` (n = ${v.n})` : ''}`)}"/>`;
        if (v.ee) s += `<line x1="${x + bw / 2}" x2="${x + bw / 2}" y1="${Y(Math.min(yMax, v.y + v.ee))}" y2="${Y(Math.max(0, v.y - v.ee))}" stroke="var(--text-primary)" stroke-opacity=".55" stroke-width="1.5"/>`;
      });
      cat.split('\n').forEach((t, k) => { s += `<text x="${m.l + (i + 0.5) * anchoG}" y="${H - m.b + 17 + k * 13}" text-anchor="middle" font-size="11" fill="${k ? 'var(--text-muted)' : 'var(--text-secondary)'}">${esc(t)}</text>`; });
    });
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--axis)" stroke-width="1"/>` + referencia(op, Y, W, m) + '</svg>';   // la referencia (azar) encima de las barras
    const tabla = `<tr><th>Serie</th>${op.categorias.map(c => `<th>${esc(c.replace(/\n/g, ' '))}</th>`).join('')}</tr>` +
      series.map(se => `<tr><td>${esc(se.nombre)}</td>${se.valores.map(v => `<td>${v && esNum(v.y) ? esc(op.formato(v.y)) + (v.ee ? ` ± ${esc(op.formato(v.ee))}` : '') : '—'}</td>`).join('')}</tr>`).join('');
    montar(cont, op, barras, s, leyendaHtml(series), tabla);
  }

  // Dispersión: un punto por persona, con diagonal, ejes en 0 o recta de regresión opcionales
  function dispersion(cont, op) {
    if (!cont) return;
    const pts = op.puntos.filter(p => esNum(p.x) && esNum(p.y));
    if (pts.length < 2) return montar(cont, op, dispersion, null);
    const W = anchoDe(cont), H = op.alto || 280, m = { l: 66, r: 16, t: 26, b: 42 };
    let xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (op.ceros) { x0 = Math.min(x0, 0); x1 = Math.max(x1, 0); y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
    if (op.identidad) { x0 = y0 = Math.min(x0, y0, 0); x1 = y1 = Math.max(x1, y1); }
    const tx = ticksBonitos(x0, x1, 5), ty = ticksBonitos(y0, y1, 5);
    const X = (x) => m.l + (x - tx[0]) / (tx[tx.length - 1] - tx[0]) * (W - m.l - m.r);
    const Y = (y) => H - m.b - (y - ty[0]) / (ty[ty.length - 1] - ty[0]) * (H - m.t - m.b);
    let s = svgAbre(W, H, op.titulo) + ejeY(ty, Y, W, m, op.fyEje || op.fy);
    for (const t of tx) s += `<text x="${X(t)}" y="${H - m.b + 17}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${esc((op.fxEje || op.fx)(t))}</text>`;
    s += `<text x="${(m.l + W - m.r) / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${esc(op.xTitulo)}</text>`;
    s += `<text x="${m.l}" y="12" font-size="11" fill="var(--text-secondary)">↑ ${esc(op.yTitulo)}</text>`;
    if (op.ceros) {
      if (tx[0] < 0 && tx[tx.length - 1] > 0) s += `<line x1="${X(0)}" x2="${X(0)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--axis)" stroke-width="1.5"/>`;
      if (ty[0] < 0 && ty[ty.length - 1] > 0) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--axis)" stroke-width="1.5"/>`;
    }
    if (op.identidad) { const a = Math.max(tx[0], ty[0]), b = Math.min(tx[tx.length - 1], ty[ty.length - 1]); s += `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" stroke="var(--text-muted)" stroke-width="1.2" stroke-dasharray="5 4"/><text x="${X(b) - 4}" y="${Y(b) + 14}" text-anchor="end" font-size="11" fill="var(--text-muted)">igual en los dos</text>`; }
    if (op.recta && pts.length >= 3) { const r = recta(xs, ys); s += `<line x1="${X(tx[0])}" y1="${Y(r.ordenada + r.pendiente * tx[0])}" x2="${X(tx[tx.length - 1])}" y2="${Y(r.ordenada + r.pendiente * tx[tx.length - 1])}" stroke="var(--text-secondary)" stroke-width="1.2" stroke-dasharray="5 4"/>`; }
    for (const n of op.notas || []) {
      const izq = n.donde.includes('izq'), arr = n.donde.includes('arriba');
      s += `<text x="${izq ? m.l + 6 : W - m.r - 6}" y="${arr ? m.t + 12 : H - m.b - 8}" text-anchor="${izq ? 'start' : 'end'}" font-size="11" fill="var(--text-muted)">${esc(n.texto)}</text>`;
    }
    for (const p of pts) {
      s += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4.5" fill="${op.color}" fill-opacity=".85" stroke="var(--surface-1)" stroke-width="1.5"/>`;
      s += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="10" fill="transparent" data-tip="${esc(`${p.etiqueta}\n${op.xTitulo}: ${op.fx(p.x)}\n${op.yTitulo}: ${op.fy(p.y)}`)}"/>`;
    }
    s += '</svg>';
    const tabla = `<tr><th>Persona</th><th>${esc(op.xTitulo)}</th><th>${esc(op.yTitulo)}</th></tr>` + pts.map(p => `<tr><td>${esc(p.etiqueta)}</td><td>${esc(op.fx(p.x))}</td><td>${esc(op.fy(p.y))}</td></tr>`).join('');
    montar(cont, op, dispersion, s, '', tabla);
  }

  // Tira de puntos: un punto por persona en cada grupo, con media e IC 95 % y líneas de referencia
  function tira(cont, op) {
    if (!cont) return;
    const grupos = op.grupos.filter(g => g.valores.length);
    if (!grupos.length) return montar(cont, op, tira, null);
    const W = anchoDe(cont), H = op.alto || 280, m = { l: 62, r: 16, t: 14, b: 40 };
    const todos = grupos.flatMap(g => g.valores.map(v => v.v)).concat((op.referencias || []).map(r => r.y));
    let y0 = op.yMin !== undefined ? op.yMin : Math.min(...todos), y1 = op.yMax !== undefined ? op.yMax : Math.max(...todos);
    const ticks = ticksBonitos(y0, y1, 5); y0 = Math.min(y0, ticks[0]); y1 = Math.max(y1, ticks[ticks.length - 1]);
    const Y = (y) => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
    const anchoG = (W - m.l - m.r) / op.grupos.length;
    const hash = (t) => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
    let s = svgAbre(W, H, op.titulo) + ejeY(ticks.filter(t => t >= y0 && t <= y1), Y, W, m, op.formatoEje || op.formato);
    for (const r of op.referencias || []) {
      const xa = r.grupo === undefined ? m.l : m.l + r.grupo * anchoG + 6, xb = r.grupo === undefined ? W - m.r : m.l + (r.grupo + 1) * anchoG - 6;
      s += `<line x1="${xa}" x2="${xb}" y1="${Y(r.y)}" y2="${Y(r.y)}" stroke="${r.color || 'var(--axis)'}" stroke-width="${r.color ? 2 : 1.5}" stroke-dasharray="5 4" data-tip="${esc(`${r.texto}: ${op.formato(r.y)}`)}"/>`;
      if (!r.color) s += `<text x="${m.l + 4}" y="${Y(r.y) - 5}" font-size="11" fill="var(--text-muted)">${esc(r.texto)}</text>`;
    }
    op.grupos.forEach((g, i) => {
      const cx = m.l + (i + 0.5) * anchoG, ancho = Math.min(90, anchoG * 0.5);
      for (const v of g.valores) {
        const jit = ((hash(v.etiqueta) % 1000) / 1000 - 0.5) * ancho;
        s += `<circle cx="${cx + jit}" cy="${Y(v.v)}" r="4" fill="${g.color}" fill-opacity=".7" stroke="var(--surface-1)" stroke-width="1" data-tip="${esc(`${v.etiqueta}\n${g.nombre}: ${op.formato(v.v)}`)}"/>`;
      }
      const t = tUna(g.valores.map(v => v.v));
      if (t) {
        s += `<line x1="${cx + ancho / 2 + 12}" x2="${cx + ancho / 2 + 12}" y1="${Y(t.m + t.ic)}" y2="${Y(t.m - t.ic)}" stroke="var(--text-primary)" stroke-width="2"/>`;
        s += `<line x1="${cx + ancho / 2 + 4}" x2="${cx + ancho / 2 + 20}" y1="${Y(t.m)}" y2="${Y(t.m)}" stroke="var(--text-primary)" stroke-width="3" data-tip="${esc(`${g.nombre}: media ${op.formato(t.m)}\nIC 95 % ${op.formato(t.m - t.ic)} a ${op.formato(t.m + t.ic)} (n = ${t.n})`)}"/>`;
      }
      s += `<text x="${cx}" y="${H - m.b + 17}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${esc(g.nombre)}</text>`;
      s += `<text x="${cx}" y="${H - m.b + 30}" text-anchor="middle" font-size="11" fill="var(--text-muted)">n = ${g.valores.length}</text>`;
    });
    s += '</svg>';
    const tabla = `<tr><th>Grupo</th><th>n</th><th>Media</th><th>IC 95 %</th></tr>` + grupos.map(g => { const t = tUna(g.valores.map(v => v.v)); return `<tr><td>${esc(g.nombre)}</td><td>${g.valores.length}</td><td>${t ? esc(op.formato(t.m)) : '—'}</td><td>${t ? esc(`${op.formato(t.m - t.ic)} a ${op.formato(t.m + t.ic)}`) : '—'}</td></tr>`; }).join('');
    const vistas = new Set(), leyenda = (op.referencias || []).filter(r => r.color && !vistas.has(r.texto) && vistas.add(r.texto)).map(r => ({ nombre: r.texto, color: r.color, discontinua: true }));
    op.series = leyenda;   // para la leyenda del PNG
    const tablaRef = (op.referencias || []).filter(r => r.color).map(r => `<tr><td>${esc(r.texto)} (línea)</td><td></td><td>${esc(op.formato(r.y))}</td><td></td></tr>`).join('');
    const leyendaUna = leyenda.length === 1 ? `<div class="leyenda-viz"><span><svg viewBox="0 0 22 10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" stroke="${leyenda[0].color}" stroke-width="2" stroke-dasharray="4 3"/></svg>${esc(leyenda[0].nombre)}</span></div>` : '';
    montar(cont, op, tira, s, leyenda.length > 1 ? leyendaHtml(leyenda) : leyendaUna, tabla + tablaRef);
  }

  /* =================== descargar un gráfico en PNG =================== */
  function exportarPNG(cont, op) {
    const svg = cont.querySelector('svg.plot'); if (!svg) return;
    const estilo = getComputedStyle(cont);
    const resolver = (v) => v.replace(/var\((--[\w-]+)\)/g, (_, n) => estilo.getPropertyValue(n).trim() || '#888888');
    const clon = svg.cloneNode(true);
    clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clon.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    clon.querySelectorAll('*').forEach(el => { for (const at of ['fill', 'stroke']) { const v = el.getAttribute(at); if (v && v.includes('var(')) el.setAttribute(at, resolver(v)); } el.removeAttribute('data-tip'); });
    const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height, esc_ = 2.5;
    const lienzo = document.createElement('canvas'), ctx = lienzo.getContext('2d');
    // título, subtítulo (en varias líneas si hace falta) y leyenda
    const partir = (texto, fuente) => {
      ctx.font = fuente;
      const out = []; let linea = '';
      for (const pal of String(texto || '').split(' ')) { const prueba = linea ? linea + ' ' + pal : pal; if (ctx.measureText(prueba).width > W - 8 && linea) { out.push(linea); linea = pal; } else linea = prueba; }
      if (linea) out.push(linea);
      return out;
    };
    const lineasTit = partir(op.titulo, 'bold 15px Arial'), lineasSub = partir(op.sub, '11.5px Arial');
    const ley = (op.series || []).filter(se => se.nombre && se.color && (se.puntos ? se.puntos.size : true));
    const altoTit = lineasTit.length * 19, cab = altoTit + 8 + lineasSub.length * 15 + (ley.length >= 1 ? 22 : 4);
    lienzo.width = W * esc_; lienzo.height = (H + cab + 6) * esc_;
    ctx.scale(esc_, esc_);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H + cab + 6);
    ctx.fillStyle = '#0b0b0b'; ctx.font = 'bold 15px Arial'; lineasTit.forEach((l, i) => ctx.fillText(l, 4, 18 + i * 19));
    ctx.fillStyle = '#52514e'; ctx.font = '11.5px Arial'; lineasSub.forEach((l, i) => ctx.fillText(l, 4, altoTit + 17 + i * 15));
    if (ley.length >= 1) {
      let x = 4; const y = altoTit + 8 + lineasSub.length * 15 + 10;
      for (const se of ley) {
        ctx.strokeStyle = se.color; ctx.lineWidth = 2; ctx.setLineDash(se.discontinua ? [4, 3] : []);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 20, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = se.color; ctx.beginPath(); ctx.arc(x + 10, y, 3.5, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#52514e'; ctx.font = '11.5px Arial'; ctx.fillText(se.nombre, x + 26, y + 4);
        x += 26 + ctx.measureText(se.nombre).width + 18;
      }
    }
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, cab, W, H);
      lienzo.toBlob(b => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = String(op.titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clon));
  }

  /* =================== tooltip =================== */
  const tip = $('tip');
  document.addEventListener('mousemove', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-tip]') : null;
    if (!el) { tip.style.display = 'none'; return; }
    tip.textContent = el.getAttribute('data-tip');
    tip.style.display = 'block';
    const x = Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    const y = ev.clientY + 18 + tip.offsetHeight > window.innerHeight ? ev.clientY - tip.offsetHeight - 10 : ev.clientY + 18;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });

  // ?proyecto=1 carga directamente los datos del proyecto; ?navegador=1, lo guardado en este navegador
  const params = new URLSearchParams(location.search);
  if (params.get('proyecto') === '1') cargarProyecto();
  if (params.get('navegador') === '1') $('btn-navegador').click();
})();
