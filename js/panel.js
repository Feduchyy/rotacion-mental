/* =====================================================================
 *  PANEL DE RESULTADOS (panel.html)
 * ---------------------------------------------------------------------
 *  Lee los CSV del laboratorio, de la versión online (hoja «ensayos»),
 *  de la red siamesa (evaluar.py) y del test por chat
 *  (corregir_test_chat.py), y resume:
 *    - Estudio 1: precisión y TR por ángulo (media de participantes ± EE)
 *    - control 2D: figuras planas frente a cubos en las mismas personas
 *    - personas frente a IA: precisión por ángulo, 3D y control 2D
 *    - Estudio 2: diferencias apareadas por participante
 *    - efecto del orden de los tests (1.º, 2.º o 3.º)
 *  Todo se calcula en el navegador; no se envía nada.
 * ===================================================================== */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (x, d = 0) => x === null || x === undefined || isNaN(x) ? '—' : (x * 100).toFixed(d).replace('.', ',') + ' %';
  const msf = (x) => x === null || x === undefined || isNaN(x) ? '—' : Math.round(x).toLocaleString('es-ES') + ' ms';
  const num = (x, d = 2) => x === null || x === undefined || isNaN(x) ? '—' : x.toFixed(d).replace('.', ',');
  // Paleta categórica de referencia (orden fijo, validada); el color sigue a la entidad
  const PALETA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

  let filas = [];          // registros normalizados
  const cargados = [];     // { nombre, n, tipo }
  const claves = new Set(); // para no duplicar filas

  /* =================== lectura de CSV =================== */
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

  const num0 = (v) => { const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; };

  // Convierte una fila de cualquiera de los CSV a un formato común
  function normalizar(f, archivo) {
    if (!f.angulo || !f.tipo) return null;
    const esIA = f.agente === 'ia' || f.agente === 'ia_chat' || /^red_siamesa/.test(f.modelo || '');
    let condicion = MR.claveBase(f.condicion || '');
    if (!condicion) condicion = /2d/i.test(archivo) ? 'control_2d' : 'sin_limite';
    const respondida = f.respuesta === 'igual' || f.respuesta === 'espejo';
    const r = {
      ia: esIA, archivo, condicion,
      demo: /_demo$/.test(f.condicion || ''),
      bloque: f.bloque || 'test', ensayo: f.ensayo, angulo: num0(f.angulo), tipo: f.tipo,
      acierto: f.acierto === '' ? (respondida ? +(f.respuesta === f.tipo) : null) : num0(f.acierto),
      tr: num0(f.tr_ms), dsProg: f.distractor_sonoro_programado === '1', dvProg: f.distractor_visual_programado === '1',
      prueba: f.prueba === '1' || /_demo$/.test(f.condicion || ''),
      modalidad: esIA ? 'ia' : (f.modalidad || 'laboratorio'),
      dispositivo: f.dispositivo || '', sesion: f.sesion || '', simulado: !!f.simulado,
      // orden de los tests de la sesión ('sin_limite>distraccion') y posición de este test (1, 2…)
      orden: f.orden_bloques || f.orden_estudio2 || '', posicion: num0(f.posicion_bloque)
    };
    if (esIA) {
      // Agente: la red siamesa por nombre (IA-9, IA-9mix) y cada modelo de chat por su nombre (+ con ejemplos)
      r.agente = f.agente === 'ia_chat' ? (f.modelo || f.sujeto) + (f.ejemplos === '1' ? ' (con ejemplos)' : '')
        : String(f.sujeto || 'IA-9').replace(/_s\d+$/, '');
      r.sujeto = r.agente + '|' + (f.sujeto || '') + '|' + (f.repeticion || '');
      r.clave = ['ia', r.sujeto, condicion, r.bloque, f.ensayo, f.figura, f.angulo, f.tipo].join('|');
    } else {
      r.sujeto = f.sujeto;
      r.clave = ['h', f.sujeto, f.sesion, condicion, r.bloque, f.ensayo].join('|');
    }
    return r;
  }

  function anadir(registros, nombre, tipo) {
    let n = 0;
    for (const r of registros) {
      if (!r || claves.has(r.clave)) continue;
      claves.add(r.clave); filas.push(r); n++;
    }
    cargados.push({ nombre, n, tipo });
    pintarArchivos(); recalcular();
  }

  function leerArchivos(lista) {
    for (const archivo of lista) {
      const lector = new FileReader();
      lector.onload = () => {
        const datos = parsearCsv(String(lector.result));
        const regs = datos.map(f => normalizar(f, archivo.name));
        const ia = regs.some(r => r && r.ia), hum = regs.some(r => r && !r.ia);
        anadir(regs, archivo.name, ia && hum ? 'mixto' : ia ? 'IA' : hum ? 'personas' : 'sin datos reconocibles');
      };
      lector.readAsText(archivo, 'utf-8');
    }
  }

  /* =================== carga =================== */
  const zona = $('zona-carga');
  $('entrada-archivos').addEventListener('change', (e) => { leerArchivos(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.add('encima'); }));
  ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.remove('encima'); }));
  zona.addEventListener('drop', (e) => leerArchivos(e.dataTransfer.files));

  $('btn-navegador').addEventListener('click', () => {
    const sesiones = MR.Almacen.todas();
    const regs = [];
    for (const s of sesiones) {
      for (const v of MR.valoresFilas(s)) {
        const f = Object.fromEntries(MR.COLUMNAS_CSV.map((c, i) => [c, String(v[i])]));
        regs.push(normalizar(f, 'navegador'));
      }
    }
    anadir(regs, `Guardados en este navegador (${sesiones.length} bloques)`, 'personas');
  });

  $('btn-simulados').addEventListener('click', () => anadir(simular(), 'DATOS SIMULADOS (24 personas)', 'simulados'));
  $('btn-vaciar').addEventListener('click', () => { filas = []; cargados.length = 0; claves.clear(); pintarArchivos(); recalcular(); });
  ['f-prueba', 'f-modalidad', 'f-precision', 'f-umbral', 'f-tr', 'f-primero'].forEach(id => $(id).addEventListener('input', recalcular));

  function pintarArchivos() {
    $('archivos').innerHTML = cargados.map(c => `<span class="chip ${c.tipo === 'simulados' ? 'prueba' : c.tipo === 'IA' ? 'online' : ''}">${esc(c.nombre)} · ${c.n} filas · ${esc(c.tipo)}</span>`).join('');
    $('aviso-sim').hidden = !filas.some(r => r.simulado);
    $('resultados').hidden = !filas.length;
  }

  /* =================== datos simulados (solo para ver el panel) =================== */
  function simular() {
    let semilla = 12345;
    const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    const normal = () => Math.sqrt(-2 * Math.log(azar() + 1e-9)) * Math.cos(2 * Math.PI * azar());
    const regs = [];
    // Los tres tests en orden contrabalanceado: las 6 permutaciones van rotando (4 personas cada una).
    // Cada test sale algo mejor cuantos más tests se han hecho antes (práctica).
    const ordenes = MR.ordenesPosibles(['sin_limite', 'distraccion', 'control_2d']);
    const paresPorCelda = { sin_limite: 6, distraccion: 4, control_2d: 6 };
    for (let p = 1; p <= 24; p++) {
      const sujeto = 'SIM' + String(p).padStart(2, '0');
      const modalidad = p % 2 ? 'laboratorio' : 'online';
      const lento = Math.exp(normal() * 0.25), pend = 9 + normal() * 3;
      const plan = ordenes[(p - 1) % ordenes.length];
      const orden = plan.join('>');
      plan.forEach((condicion, posicion) => {
        const porCelda = paresPorCelda[condicion], con = condicion === 'distraccion', es2D = condicion === 'control_2d';
        let ensayo = 0;
        for (const angulo of [0, 50, 100, 150]) for (const tipo of ['igual', 'espejo']) for (let i = 0; i < porCelda; i++) {
          // En 2D: más rápido y con la mitad de pendiente (el giro en el plano es más fácil)
          const base = (es2D ? 700 : 1000) + (es2D ? 0.5 : 1) * pend * angulo + (tipo === 'espejo' ? 250 : 0) + (con ? 220 : 0);
          const tr = Math.max(350, base * lento * (1 - 0.06 * posicion) * Math.exp(normal() * 0.3));
          const pAcierto = 0.95 - 0.0007 * angulo - (tipo === 'espejo' ? 0.03 : 0) - (con ? 0.04 : 0) + (es2D ? 0.02 : 0) + 0.015 * posicion;
          const acierto = azar() < pAcierto ? 1 : 0;
          ensayo++;
          regs.push(normalizar({
            sujeto, sesion: sujeto + '_' + condicion, condicion, bloque: 'test', ensayo: String(ensayo), angulo: String(angulo), tipo,
            respuesta: acierto ? tipo : (tipo === 'igual' ? 'espejo' : 'igual'), acierto: String(acierto), tr_ms: tr.toFixed(1),
            distractor_sonoro_programado: con ? '1' : '0', distractor_visual_programado: con ? '1' : '0',
            orden_bloques: orden, posicion_bloque: String(posicion + 1),
            modalidad, prueba: '0', dispositivo: modalidad === 'online' && p % 4 === 0 ? 'movil' : 'ordenador', simulado: true
          }, 'simulados'));
        }
      });
    }
    return regs;
  }

  /* =================== estadística =================== */
  const media = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
  const ee = (xs) => {
    if (xs.length < 2) return null;
    const m = media(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1) / xs.length);
  };
  const mediana = (xs) => MR.mediana(xs);
  // p bilateral de la t de Student (beta incompleta regularizada)
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
      for (let m = 1; m <= 200; m++) {
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
  function tApareada(difs) {
    const n = difs.length;
    if (n < 2) return null;
    const m = media(difs), e = ee(difs);
    if (!e) return { n, m, e, t: null, p: null };
    const t = m / e, gl = n - 1;
    return { n, m, e, t, gl, p: betaInc(gl / (gl + t * t), gl / 2, 0.5) };
  }
  const formatoP = (p) => p === null || p === undefined ? '' : p < 0.001 ? 'p < 0,001' : 'p = ' + p.toFixed(3).replace('.', ',');

  /* =================== análisis =================== */
  function recalcular() {
    if (!filas.length) return;
    const quitarPrueba = $('f-prueba').checked, modalidad = $('f-modalidad').value;
    const filtroPrecision = $('f-precision').checked, umbral = (+$('f-umbral').value || 0) / 100;
    const filtroTr = $('f-tr').checked;
    const trValido = (r) => r.tr !== null && (!filtroTr || (r.tr >= 300 && r.tr <= 20000));

    // ---- personas ----
    const humanos = filas.filter(r => !r.ia && r.bloque === 'test' && (!quitarPrueba || !r.prueba) && (!modalidad || r.modalidad === modalidad));
    const porSujeto = new Map();
    for (const r of humanos) { if (!porSujeto.has(r.sujeto)) porSujeto.set(r.sujeto, []); porSujeto.get(r.sujeto).push(r); }
    const angulos = [...new Set(filas.filter(r => r.angulo !== null).map(r => r.angulo))].sort((a, b) => a - b);

    const precisionDe = (rs) => { const resp = rs.filter(r => r.acierto !== null); return resp.length ? resp.filter(r => r.acierto === 1).length / resp.length : null; };
    const trDe = (rs) => mediana(rs.filter(r => r.acierto === 1 && trValido(r)).map(r => r.tr));
    // pendiente (ms/°): mediana de TR de aciertos en pares iguales por ángulo (≥ 2 aciertos en ≥ 3 ángulos)
    const pendienteDe = (rs) => {
      const puntos = angulos.map(a => {
        const ok = rs.filter(r => r.tipo === 'igual' && r.angulo === a && r.acierto === 1 && trValido(r)).map(r => r.tr);
        return { a, n: ok.length, m: mediana(ok) };
      }).filter(x => x.n >= 2);
      const reg = puntos.length >= 3 ? MR.regresion(puntos.map(x => x.a), puntos.map(x => x.m)) : null;
      return reg ? reg.pendiente : null;
    };
    const F = { precisionDe, trDe, pendienteDe };

    const participantes = [...porSujeto.entries()].map(([sujeto, rs]) => {
      const e1 = rs.filter(r => r.condicion === 'sin_limite');
      const e2d = rs.filter(r => r.condicion === 'control_2d');
      const posDe = (cond) => { const r = rs.find(x => x.condicion === cond && x.posicion !== null); return r ? r.posicion : null; };
      const p = {
        sujeto, rs, modalidad: rs[0].modalidad, dispositivo: rs[0].dispositivo, simulado: rs[0].simulado,
        condiciones: [...new Set(rs.map(r => r.condicion))],
        orden: (rs.find(r => r.orden) || {}).orden || '', posE1: posDe('sin_limite'), posDe,
        e1, precE1: e1.length ? precisionDe(e1) : null, trE1: e1.length ? trDe(e1) : null,
        e2d, prec2D: e2d.length ? precisionDe(e2d) : null
      };
      p.pendiente = pendienteDe(e1);
      p.excluido = filtroPrecision && p.precE1 !== null && p.precE1 < umbral;
      return p;
    });
    const incluidos = participantes.filter(p => !p.excluido);

    // ---- IA ----
    const ia = filas.filter(r => r.ia && r.bloque === 'test');
    const agentes = [...new Set(ia.map(r => r.agente))].sort((a, b) => a.localeCompare(b, 'es'));
    const colorAgente = { Personas: PALETA[0] };
    agentes.forEach((a, i) => { colorAgente[a] = PALETA[(i + 1) % PALETA.length]; });

    pintarBaldosas(participantes, incluidos, agentes);

    // ---- Estudio 1: precisión y TR por ángulo ----
    // Con «solo en primer lugar», el test normal (y el 2D, en la comparación con la IA) solo cuenta si se hizo
    // antes que los demás: sin práctica previa, como la IA
    const soloPrimero = $('f-primero').checked;
    const enPrimerLugar = (p, cond) => !soloPrimero || p.posDe(cond) === null || p.posDe(cond) === 1;
    const conE1 = incluidos.filter(p => enPrimerLugar(p, 'sin_limite'));
    const serieTipo = (tipo, medida) => {
      const puntos = new Map();
      for (const a of angulos) {
        const vals = conE1.map(p => {
          const rs = p.e1.filter(r => r.angulo === a && r.tipo === tipo);
          return rs.length ? (medida === 'precision' ? precisionDe(rs) : trDe(rs)) : null;
        }).filter(v => v !== null);
        if (vals.length) puntos.set(a, { y: media(vals), ee: ee(vals), n: vals.length });
      }
      return puntos;
    };
    const nE1 = conE1.filter(p => p.e1.length).length;
    grafico($('g-precision'), {
      titulo: 'Precisión por ángulo', sub: `Test normal · media de ${nE1} participante(s) ± error estándar` + (soloPrimero ? ' · solo si fue el primer test' : ''),
      xs: angulos, yMin: 0, yMax: 1, formato: (y) => pct(y), ticks: [0, 0.25, 0.5, 0.75, 1], referencia: { y: 0.5, texto: 'azar' },
      series: [{ nombre: 'Pares iguales', color: PALETA[0], puntos: serieTipo('igual', 'precision') },
               { nombre: 'Pares espejo', color: PALETA[1], puntos: serieTipo('espejo', 'precision') }]
    });
    const pendientes = conE1.map(p => p.pendiente).filter(x => x !== null);
    grafico($('g-tr'), {
      titulo: 'Tiempo de respuesta por ángulo', sub: `Test normal · mediana de los aciertos de cada persona; media ± EE` +
        (pendientes.length ? ` · pendiente media ${num(media(pendientes), 1)} ms/° (n = ${pendientes.length})` : ''),
      xs: angulos, yMin: 0, formato: (y) => msf(y),
      series: [{ nombre: 'Pares iguales', color: PALETA[0], puntos: serieTipo('igual', 'tr') },
               { nombre: 'Pares espejo', color: PALETA[1], puntos: serieTipo('espejo', 'tr') }]
    });

    // ---- control 2D en personas: las mismas personas con figuras de cubos (test normal) y planas ----
    const conDos = incluidos.filter(p => p.e1.length && p.e2d.length);
    const serieDim = (rsDe, medida) => {
      const puntos = new Map();
      for (const a of angulos) {
        const vals = conDos.map(p => {
          // precisión: todos los pares de ese ángulo; TR: aciertos en pares iguales (como la pendiente)
          const rs = rsDe(p).filter(r => r.angulo === a && (medida === 'precision' || r.tipo === 'igual'));
          return rs.length ? (medida === 'precision' ? precisionDe(rs) : trDe(rs)) : null;
        }).filter(v => v !== null);
        if (vals.length) puntos.set(a, { y: media(vals), ee: ee(vals), n: vals.length });
      }
      return puntos;
    };
    const pend3D = conDos.map(p => pendienteDe(p.e1)).filter(x => x !== null);
    const pend2D = conDos.map(p => pendienteDe(p.e2d)).filter(x => x !== null);
    grafico($('g-dim-precision'), {
      titulo: 'Precisión por ángulo · cubos frente a figuras planas', sub: `Mismas personas (n = ${conDos.length}) · todos los pares · media ± EE`,
      xs: angulos, yMin: 0, yMax: 1, formato: (y) => pct(y), ticks: [0, 0.25, 0.5, 0.75, 1], referencia: { y: 0.5, texto: 'azar' },
      series: [{ nombre: '3D (test normal)', color: PALETA[0], puntos: serieDim(p => p.e1, 'precision') },
               { nombre: '2D (control)', color: PALETA[1], puntos: serieDim(p => p.e2d, 'precision') }]
    });
    grafico($('g-dim-tr'), {
      titulo: 'Tiempo de respuesta por ángulo · cubos frente a figuras planas', sub: `Mismas personas · pares iguales, mediana de los aciertos de cada persona; media ± EE` +
        (pend3D.length ? ` · pendiente media: 3D ${num(media(pend3D), 1)} ms/°` : '') + (pend2D.length ? `, 2D ${num(media(pend2D), 1)} ms/°` : ''),
      xs: angulos, yMin: 0, formato: (y) => msf(y),
      series: [{ nombre: '3D (test normal)', color: PALETA[0], puntos: serieDim(p => p.e1, 'tr') },
               { nombre: '2D (control)', color: PALETA[1], puntos: serieDim(p => p.e2d, 'tr') }]
    });

    // ---- personas frente a IA ----
    const seriesComparacion = (condicion) => {
      const series = [];
      const hum = new Map();
      const personas = incluidos.filter(p => enPrimerLugar(p, condicion));
      for (const a of angulos) {
        const vals = personas.map(p => { const rs = p.rs.filter(r => r.condicion === condicion && r.angulo === a); return rs.length ? precisionDe(rs) : null; }).filter(v => v !== null);
        if (vals.length) hum.set(a, { y: media(vals), ee: ee(vals), n: vals.length });
      }
      if (hum.size) series.push({ nombre: 'Personas', color: colorAgente.Personas, puntos: hum });
      for (const ag of agentes) {
        const rsAg = ia.filter(r => r.agente === ag && r.condicion === condicion);
        if (!rsAg.length) continue;
        const reps = [...new Set(rsAg.map(r => r.sujeto))];
        const pts = new Map();
        for (const a of angulos) {
          const vals = reps.map(s => { const rs = rsAg.filter(r => r.sujeto === s && r.angulo === a); return rs.length ? precisionDe(rs) : null; }).filter(v => v !== null);
          if (vals.length) pts.set(a, { y: media(vals), ee: ee(vals), n: vals.length });
        }
        series.push({ nombre: ag, color: colorAgente[ag], puntos: pts });
      }
      return series;
    };
    grafico($('g-ia3d'), {
      titulo: 'Precisión por ángulo · figuras 3D', sub: 'Test normal (personas) y los mismos 48 pares para la IA · media de participantes o repeticiones ± EE' +
        (soloPrimero ? ' · personas: solo si fue su primer test' : ''),
      xs: angulos, yMin: 0, yMax: 1, formato: (y) => pct(y), ticks: [0, 0.25, 0.5, 0.75, 1], referencia: { y: 0.5, texto: 'azar' },
      series: seriesComparacion('sin_limite')
    });
    grafico($('g-ia2d'), {
      titulo: 'Precisión por ángulo · control 2D', sub: 'Figuras planas de cuadrados: control 2D (personas) y los mismos 48 pares para la IA · media ± EE' +
        (soloPrimero ? ' · personas: solo si fue su primer test' : ''),
      xs: angulos, yMin: 0, yMax: 1, formato: (y) => pct(y), ticks: [0, 0.25, 0.5, 0.75, 1], referencia: { y: 0.5, texto: 'azar' },
      series: seriesComparacion('control_2d')
    });

    pintarFrenteNormal($('t-dimension'), ['control_2d'], incluidos, F, 'No hay datos del control 2D de personas con los archivos y filtros actuales.');
    pintarFrenteNormal($('t-estudio2'), ['distraccion', 'distractor_sonoro', 'distractor_visual', 'exposicion_breve', 'secuencial'], incluidos, F,
      'No hay datos del Estudio 2 con los archivos y filtros actuales.');
    pintarOrden(incluidos, F);
    pintarParticipantes(participantes);
  }

  function pintarBaldosas(participantes, incluidos, agentes) {
    const lab = incluidos.filter(p => p.modalidad === 'laboratorio').length;
    const onl = incluidos.filter(p => p.modalidad === 'online').length;
    const completos = incluidos.filter(p => MR.SESION.bloques.every(c => p.condiciones.includes(c))).length;
    // Con qué test empezó cada persona (de las que hicieron más de uno)
    const mini = (c) => c === 'control_2d' ? '2D' : (MR.NOMBRES_MINI[c] || c).toLowerCase();
    const empiezan = MR.SESION.bloques.map(c => incluidos.filter(p => p.condiciones.length > 1 && p.posDe(c) === 1).length);
    const precs = incluidos.map(p => p.precE1).filter(x => x !== null);
    const precs2D = incluidos.map(p => p.prec2D).filter(x => x !== null);
    const nTests = MR.SESION.bloques.length;
    $('baldosas').innerHTML = [
      [incluidos.length, 'participantes incluidos'],
      [`${lab} · ${onl}`, 'laboratorio · online'],
      [participantes.length - incluidos.length, 'excluidos por precisión'],
      [completos, `con los ${nTests === 3 ? 'tres' : nTests === 2 ? 'dos' : nTests} tests`],
      [empiezan.join(' · '), 'empezaron por ' + MR.SESION.bloques.map(mini).join(' · ')],
      [precs.length ? pct(media(precs)) : '—', 'precisión media en el test normal'],
      [precs2D.length ? pct(media(precs2D)) : '—', 'precisión media en el control 2D'],
      [agentes.length, 'modelos de IA cargados']
    ].map(([v, t]) => `<div class="baldosa"><div class="v">${v}</div><div class="t">${t}</div></div>`).join('');
  }

  // Celda «diferencia ± EE» con su t y su p (cada cifra con su unidad en una sola línea; signo menos tipográfico)
  const sinCorte = (s) => `<span style="white-space:nowrap">${String(s).replace(/^-/, '−')}</span>`;
  const celdaDif = (r, f) => r ? `${sinCorte((r.m >= 0 ? '+' : '') + f(r.m))} ± ${sinCorte(f(r.e))}${r.t !== null ? `<div class="nota">t(${num(r.gl, r.gl % 1 ? 1 : 0)}) = ${num(r.t).replace(/^-/, '−')}, ${formatoP(r.p)}</div>` : ''}` : '—';
  const fpp = (x) => num(x * 100, 1) + ' pp', fms = (x) => Math.round(x) + ' ms', fpend = (x) => num(x, 1) + ' ms/°';

  // Cada test frente al test normal de la MISMA persona (diferencias apareadas): todos y, por separado,
  // según el orden relativo de los dos tests. Sirve para el Estudio 2 (distracción) y para el control 2D.
  function pintarFrenteNormal(tabla, lista, incluidos, F, vacio) {
    const { precisionDe, trDe, pendienteDe } = F;
    const filasT = [];
    const fila = (nombre, comparacion, d) => {
      filasT.push(`<tr><td>${esc(nombre)}</td><td>${esc(comparacion)}</td><td>${d.prec.length}</td>
        <td>${celdaDif(tApareada(d.prec), fpp)}</td><td>${celdaDif(tApareada(d.tr), fms)}</td><td>${celdaDif(tApareada(d.pend), fpend)}</td></tr>`);
    };
    const restar = (a, b, d, campo, f) => { const x = f(a), y = f(b); if (x !== null && y !== null) d[campo].push(x - y); };
    const difs = (personas, cond) => {
      const d = { prec: [], tr: [], pend: [] };
      for (const p of personas) {
        const c = p.rs.filter(r => r.condicion === cond);
        if (!c.length || !p.e1.length) continue;
        restar(c, p.e1, d, 'prec', precisionDe); restar(c, p.e1, d, 'tr', trDe); restar(c, p.e1, d, 'pend', pendienteDe);
      }
      return d;
    };
    const presentes = new Set(incluidos.flatMap(p => p.condiciones));
    for (const cond of lista.filter(c => presentes.has(c))) {
      const nombre = MR.nombreCorto(cond);
      fila(nombre, 'test − normal (todos)', difs(incluidos, cond));
      const normalAntes = incluidos.filter(p => p.posE1 !== null && p.posDe(cond) !== null && p.posE1 < p.posDe(cond));
      const esteAntes = incluidos.filter(p => p.posE1 !== null && p.posDe(cond) !== null && p.posDe(cond) < p.posE1);
      if (normalAntes.length) fila(nombre, '· el normal antes que este test', difs(normalAntes, cond));
      if (esteAntes.length) fila(nombre, '· este test antes que el normal', difs(esteAntes, cond));
      // si el test tiene pares con y sin distracción (probabilidad < 1), también dentro del test
      const d = { prec: [], tr: [], pend: [] };
      for (const p of incluidos) {
        const rs = p.rs.filter(r => r.condicion === cond);
        const con = rs.filter(r => r.dsProg || r.dvProg), sin = rs.filter(r => !r.dsProg && !r.dvProg);
        if (!con.length || !sin.length) continue;
        restar(con, sin, d, 'prec', precisionDe); restar(con, sin, d, 'tr', trDe); restar(con, sin, d, 'pend', pendienteDe);
      }
      if (d.prec.length) fila(nombre, 'con − sin distracción (dentro del test)', d);
    }
    tabla.innerHTML = '<tr><th>Test</th><th>Comparación</th><th>n</th><th>Δ precisión</th><th>Δ TR (mediana de aciertos)</th><th>Δ pendiente (pares iguales)</th></tr>' +
      (filasT.length ? filasT.join('') : `<tr><td colspan="6" class="vacio">${esc(vacio)}</td></tr>`);
  }

  // Efecto del orden (práctica): el mismo test hecho en primer lugar frente a en segundo lugar o después
  function welch(a, b) {
    if (a.length < 2 || b.length < 2) return null;
    const ma = media(a), mb = media(b);
    const va = a.reduce((s, x) => s + (x - ma) ** 2, 0) / (a.length - 1), vb = b.reduce((s, x) => s + (x - mb) ** 2, 0) / (b.length - 1);
    const sa = va / a.length, sb = vb / b.length, e = Math.sqrt(sa + sb);
    if (!e) return { m: mb - ma, e: 0, t: null };
    const t = (mb - ma) / e, gl = (sa + sb) ** 2 / (sa * sa / (a.length - 1) + sb * sb / (b.length - 1));
    return { m: mb - ma, e, t, gl, p: betaInc(gl / (gl + t * t), gl / 2, 0.5) };
  }
  // Cada test según la posición en que se hizo (1.º, 2.º, 3.º…), y el 1.º frente a todos los demás
  function pintarOrden(incluidos, F) {
    const { precisionDe, trDe } = F;
    const presentes = new Set(incluidos.flatMap(p => p.condiciones));
    const condiciones = ['sin_limite', 'distraccion', 'control_2d'].filter(c => presentes.has(c));
    const maxPos = Math.min(6, Math.max(1, ...incluidos.flatMap(p => condiciones.map(c => p.posDe(c) || 0))));
    const posiciones = Array.from({ length: maxPos }, (_, i) => i + 1);
    const ordinal = ['1.er', '2.º', '3.er', '4.º', '5.º', '6.º'];
    const resumen = (xs, f) => xs.length ? `${f(media(xs))}${xs.length > 1 ? ' ± ' + f(ee(xs)) : ''}` : '—';
    const filasT = condiciones.map(cond => {
      const valores = (cumple) => {
        const ps = incluidos.filter(p => p.posDe(cond) !== null && cumple(p.posDe(cond)));
        const prec = [], tr = [];
        for (const p of ps) {
          const rs = p.rs.filter(r => r.condicion === cond);
          const a = precisionDe(rs), b = trDe(rs);
          if (a !== null) prec.push(a);
          if (b !== null) tr.push(b);
        }
        return { n: ps.length, prec, tr };
      };
      const v1 = valores(k => k === 1), vDespues = valores(k => k > 1);
      return `<tr><td>${esc(MR.nombreCorto(cond))}</td>` +
        posiciones.map(k => {
          const v = valores(x => x === k);
          return `<td>${v.n ? `${resumen(v.prec, x => pct(x, 1))}<div class="nota">${resumen(v.tr, msf)} · n = ${v.n}</div>` : '—'}</td>`;
        }).join('') +
        `<td>${celdaDif(welch(v1.prec, vDespues.prec), fpp)}</td><td>${celdaDif(welch(v1.tr, vDespues.tr), fms)}</td></tr>`;
    });
    $('t-orden').innerHTML = `<tr><th>Test</th>${posiciones.map(k => `<th>Hecho en ${ordinal[k - 1]} lugar<div class="nota">precisión · TR · n</div></th>`).join('')}` +
      '<th>Δ precisión (después − 1.º)</th><th>Δ TR (después − 1.º)</th></tr>' +
      (incluidos.some(p => p.posE1 !== null) && filasT.length ? filasT.join('')
        : `<tr><td colspan="${posiciones.length + 3}" class="vacio">Los datos no traen el orden de los tests (columnas orden_bloques y posicion_bloque).</td></tr>`);
  }

  function pintarParticipantes(participantes) {
    $('resumen-participantes').textContent = `Ver la tabla de participantes (${participantes.length})`;
    $('t-participantes').innerHTML = '<tr><th>Participante</th><th>Modalidad</th><th>Dispositivo</th><th>Orden de los tests</th><th>Precisión (normal)</th><th>TR (normal)</th><th>Pendiente</th><th>Precisión (2D)</th><th>Estado</th></tr>' +
      participantes.sort((a, b) => String(a.sujeto).localeCompare(String(b.sujeto), 'es', { numeric: true })).map(p => `
        <tr class="${p.excluido ? 'excluido' : ''}"><td>${esc(p.sujeto)}${p.simulado ? ' <span class="chip prueba">simulado</span>' : ''}</td><td>${esc(p.modalidad)}</td><td>${esc(p.dispositivo)}</td>
        <td>${esc(p.orden ? MR.nombreOrden(p.orden) : p.condiciones.map(c => MR.NOMBRES_MINI[c] || c).join(', '))}</td>
        <td>${pct(p.precE1)}</td><td>${msf(p.trE1)}</td><td>${p.pendiente !== null ? num(p.pendiente, 1) + ' ms/°' : '—'}</td>
        <td>${pct(p.prec2D)}</td><td>${p.excluido ? 'excluido (precisión)' : 'incluido'}</td></tr>`).join('');
  }

  /* =================== gráfico de líneas (SVG) =================== */
  // Se dibuja al ancho real de su caja (el texto queda siempre a 11 px) y se redibuja al cambiar el tamaño.
  const dibujados = new Map();
  let esperaRedibujo = null;
  window.addEventListener('resize', () => {
    clearTimeout(esperaRedibujo);
    esperaRedibujo = setTimeout(() => dibujados.forEach((op, cont) => grafico(cont, op)), 150);
  });

  function grafico(cont, op) {
    dibujados.set(cont, op);
    const series = op.series.filter(s => s.puntos.size);
    if (!series.length) {
      cont.innerHTML = `<h3>${esc(op.titulo)}</h3><p class="vacio">Sin datos para este gráfico con los archivos y filtros actuales.</p>`;
      return;
    }
    const W = Math.round(Math.max(300, (cont.clientWidth || 560) - 34)), H = 270, m = { l: 58, r: 18, t: 16, b: 40 };
    const xs = op.xs;
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const X = (x) => m.l + (xMax === xMin ? 0.5 : (x - xMin) / (xMax - xMin)) * (W - m.l - m.r);
    let yMax = op.yMax;
    if (yMax === undefined) {
      const tope = Math.max(...series.flatMap(s => [...s.puntos.values()].map(p => p.y + (p.ee || 0))));
      const paso = tope > 4000 ? 1000 : tope > 1500 ? 500 : 250;
      yMax = Math.max(paso, Math.ceil(tope * 1.08 / paso) * paso);
    }
    const yMin = op.yMin || 0;
    const Y = (y) => H - m.b - (y - yMin) / (yMax - yMin) * (H - m.t - m.b);
    const ticks = op.ticks || Array.from({ length: 5 }, (_, i) => yMin + (yMax - yMin) * i / 4);
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(op.titulo)}">`;
    for (const t of ticks) {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--grid)" stroke-width="1"/>`;
      s += `<text x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="11" fill="var(--text-muted)">${esc(op.formato(t))}</text>`;
    }
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(yMin)}" y2="${Y(yMin)}" stroke="var(--axis)" stroke-width="1"/>`;
    if (op.referencia) {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(op.referencia.y)}" y2="${Y(op.referencia.y)}" stroke="var(--axis)" stroke-width="1.5"/>`;
      s += `<text x="${W - m.r}" y="${Y(op.referencia.y) - 5}" text-anchor="end" font-size="11" fill="var(--text-muted)">${esc(op.referencia.texto)}</text>`;
    }
    for (const x of xs) s += `<text x="${X(x)}" y="${H - m.b + 18}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${x}°</text>`;
    s += `<text x="${(m.l + W - m.r) / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">Ángulo de giro</text>`;
    // barras de error, líneas y puntos (anillo del color de la superficie)
    for (const se of series) {
      const pts = xs.filter(x => se.puntos.has(x)).map(x => [x, se.puntos.get(x)]);
      for (const [x, p] of pts) if (p.ee) {
        s += `<line x1="${X(x)}" x2="${X(x)}" y1="${Y(Math.min(yMax, p.y + p.ee))}" y2="${Y(Math.max(yMin, p.y - p.ee))}" stroke="${se.color}" stroke-width="1.5" stroke-opacity=".55"/>`;
      }
      s += `<polyline fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map(([x, p]) => `${X(x)},${Y(p.y)}`).join(' ')}"/>`;
      for (const [x, p] of pts) {
        s += `<circle cx="${X(x)}" cy="${Y(p.y)}" r="4.5" fill="${se.color}" stroke="var(--surface-1)" stroke-width="2"/>`;
        s += `<circle cx="${X(x)}" cy="${Y(p.y)}" r="12" fill="transparent"><title>${esc(se.nombre)} · ${x}°: ${esc(op.formato(p.y))}${p.ee ? ' ± ' + esc(op.formato(p.ee)) : ''} (n = ${p.n})</title></circle>`;
      }
    }
    s += '</svg>';
    const leyenda = series.length > 1 ? `<div class="leyenda-viz">${series.map(se => `<span><i style="background:${se.color}"></i>${esc(se.nombre)}</span>`).join('')}</div>` : '';
    const tabla = `<details class="tabla-datos"><summary>Ver tabla</summary><div class="tabla-scroll"><table class="tabla"><tr><th>Serie</th>${xs.map(x => `<th>${x}°</th>`).join('')}</tr>` +
      series.map(se => `<tr><td>${esc(se.nombre)}</td>${xs.map(x => { const p = se.puntos.get(x); return `<td>${p ? esc(op.formato(p.y)) + (p.ee ? ` ± ${esc(op.formato(p.ee))}` : '') + `<div class="nota">n = ${p.n}</div>` : '—'}</td>`; }).join('')}</tr>`).join('') +
      '</table></div></details>';
    cont.innerHTML = `<h3>${esc(op.titulo)}</h3><p class="sub">${esc(op.sub || '')}</p>${leyenda}${s}${tabla}`;
  }

  // Si se abre con ?navegador=1, carga directamente lo guardado en este navegador
  if (new URLSearchParams(location.search).get('navegador') === '1') $('btn-navegador').click();
})();
