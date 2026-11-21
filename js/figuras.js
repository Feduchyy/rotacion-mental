/* =====================================================================
 *  FIGURAS 3D TIPO SHEPARD-METZLER
 * ---------------------------------------------------------------------
 *  - Generación determinista (semilla) de figuras de N cubos en brazos
 *    rectos con giros de 90°.
 *  - Comprobaciones: sin cubos repetidos ni brazos que se toquen, figura
 *    no plana, distinta de su imagen en espejo (quiral) y distinta de las
 *    demás figuras (también de sus espejos).
 *  - Dibujo en canvas con proyección ortográfica y algoritmo del pintor.
 *  - Comprobación de que todos los cubos se ven.
 *
 *  Sistema de coordenadas de vista: x a la derecha, y hacia arriba,
 *  z hacia el observador.
 * ===================================================================== */
window.MR = window.MR || {};

/* ---------------- Números aleatorios con semilla ---------------- */
MR.crearRng = function (semilla) {
  let a = (typeof semilla === 'number' ? semilla : MR.hashTexto(String(semilla))) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
MR.hashTexto = function (s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
MR.barajar = function (arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------------- Álgebra 3×3 ---------------- */
const M3 = MR.M3 = {
  id() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; },
  mul(a, b) {
    const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    return r;
  },
  // producto encadenado: M3.cadena(A, B, C) = A·B·C
  cadena(...ms) { return ms.reduce((acc, m) => M3.mul(acc, m)); },
  ap(m, v) {
    return [
      m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
      m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
      m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
    ];
  },
  det(m) {
    return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
         - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
         + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  },
  rad(g) { return g * Math.PI / 180; },
  rotX(g) { const a = M3.rad(g), c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; },
  rotY(g) { const a = M3.rad(g), c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; },
  rotZ(g) { const a = M3.rad(g), c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; },
  // Rodrigues: giro de g grados alrededor del eje unitario e
  rotEje(e, g) {
    const n = Math.hypot(e[0], e[1], e[2]); const [x, y, z] = [e[0] / n, e[1] / n, e[2] / n];
    const a = M3.rad(g), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c]
    ];
  },
  espejo(tipo) { return tipo === 'vertical' ? [[1, 0, 0], [0, -1, 0], [0, 0, 1]] : [[-1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
};

// Las 24 rotaciones que llevan el cubo en sí mismo (matrices de permutación con signo, det = +1)
MR.ROT24 = (function () {
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const res = [];
  for (const p of perms) for (let s = 0; s < 8; s++) {
    const sg = [(s & 1) ? -1 : 1, (s & 2) ? -1 : 1, (s & 4) ? -1 : 1];
    const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) m[i][p[i]] = sg[i];
    if (Math.round(M3.det(m)) === 1) res.push(m);
  }
  return res;
})();

/* ---------------- Generación de figuras ---------------- */
const clave = (c) => c[0] + ',' + c[1] + ',' + c[2];

// Giros que dejan el plano de la imagen en su sitio (para figuras 2D): 0°, 90°, 180°, 270°
MR.ROT_PLANO = MR.ROT24.filter(R => R[2][2] === 1);

// Forma canónica: igual para dos figuras si y solo si una es un giro de la otra
// (en 2D solo cuentan los giros dentro del plano)
MR.formaCanonica = function (cubos, es2D) {
  let mejor = null;
  for (const R of (es2D ? MR.ROT_PLANO : MR.ROT24)) {
    const pts = cubos.map(c => M3.ap(R, c).map(Math.round));
    const mn = [0, 1, 2].map(i => Math.min(...pts.map(p => p[i])));
    const txt = pts.map(p => clave([p[0] - mn[0], p[1] - mn[1], p[2] - mn[2]])).sort().join(';');
    if (mejor === null || txt < mejor) mejor = txt;
  }
  return mejor;
};
MR.reflejarCubos = (cubos) => cubos.map(c => [-c[0], c[1], c[2]]);

// Máximo número de cubos que coinciden al superponer B sobre A
// (probando los 24 giros de B y de su espejo, y todas las traslaciones)
const claveNum = (x, y, z) => ((x + 64) * 128 + (y + 64)) * 128 + (z + 64);
MR.solapamientoMaximo = function (A, B) {
  const setA = new Set(A.map(c => claveNum(c[0], c[1], c[2])));
  let max = 0;
  for (const Bx of [B, MR.reflejarCubos(B)]) for (const R of MR.ROT24) {
    const rb = Bx.map(c => M3.ap(R, c).map(Math.round));
    for (const a of A) for (const b of rb) {
      const tx = a[0] - b[0], ty = a[1] - b[1], tz = a[2] - b[2];
      let n = 0;
      for (const p of rb) if (setA.has(claveNum(p[0] + tx, p[1] + ty, p[2] + tz))) n++;
      if (n > max) { max = n; if (max === A.length) return max; }
    }
  }
  return max;
};

// Reparte (nCubos-1) pasos entre los brazos respetando mínimos y máximos
function repartirPasos(rng, total, nBrazos, lim) {
  for (let t = 0; t < 500; t++) {
    const p = [];
    for (let b = 0; b < nBrazos; b++) {
      const extremo = (b === 0 || b === nBrazos - 1);
      const mn = extremo ? lim.minExtremos : lim.min;
      p.push(mn + Math.floor(rng() * (lim.max - mn + 1)));
    }
    if (p.reduce((s, x) => s + x, 0) === total) return p;
  }
  return null;
}

const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const DIRS_2D = DIRS.slice(0, 4);
const ejeDe = (d) => d[0] !== 0 ? 0 : (d[1] !== 0 ? 1 : 2);

function generarCamino(rng, cfg) {
  const nC = cfg.cubosPorFigura, nB = cfg.brazosPorFigura;
  const es2D = cfg.dimension === '2d';
  const direcciones = es2D ? DIRS_2D : DIRS;
  for (let intento = 0; intento < 2000; intento++) {
    const pasos = repartirPasos(rng, nC - 1, nB, cfg.pasosPorBrazo);
    if (!pasos) continue;
    const dirs = [[1, 0, 0]];
    for (let b = 1; b < nB; b++) {
      const perp = direcciones.filter(d => d[0] * dirs[b - 1][0] + d[1] * dirs[b - 1][1] + d[2] * dirs[b - 1][2] === 0);
      dirs.push(perp[Math.floor(rng() * perp.length)]);
    }
    if (!es2D && new Set(dirs.map(ejeDe)).size < 3) continue; // en 3D debe usar los 3 ejes (no plana)

    const cubos = [[0, 0, 0]];
    for (let b = 0; b < nB; b++) for (let k = 0; k < pasos[b]; k++) {
      const u = cubos[cubos.length - 1];
      cubos.push([u[0] + dirs[b][0], u[1] + dirs[b][1], u[2] + dirs[b][2]]);
    }
    // sin cubos repetidos
    if (new Set(cubos.map(clave)).size !== cubos.length) continue;
    // cubos no consecutivos no pueden tocarse cara con cara (los brazos no se pegan)
    let tocan = false;
    for (let i = 0; i < cubos.length && !tocan; i++) for (let j = i + 2; j < cubos.length; j++) {
      const d = Math.abs(cubos[i][0] - cubos[j][0]) + Math.abs(cubos[i][1] - cubos[j][1]) + Math.abs(cubos[i][2] - cubos[j][2]);
      if (d <= 1) { tocan = true; break; }
    }
    if (tocan) continue;
    return { cubos, pasos, dirs };
  }
  return null;
}

MR.generarCamino = generarCamino;

/* ---------------- Geometría para dibujar ---------------- */
// Prepara una figura: centra los cubos en su centroide y guarda vecinos
MR.prepararFigura = function (cubosEnteros, es2D) {
  const n = cubosEnteros.length;
  const g = [0, 1, 2].map(i => cubosEnteros.reduce((s, c) => s + c[i], 0) / n);
  const ocupados = new Set(cubosEnteros.map(clave));
  const centros = cubosEnteros.map(c => [c[0] - g[0], c[1] - g[1], c[2] - g[2]]);
  const radio = Math.max(...centros.map(c => Math.hypot(c[0], c[1], c[2]))) + (es2D ? Math.SQRT1_2 : Math.sqrt(3) / 2);
  // caras exteriores (las compartidas entre cubos vecinos no se dibujan)
  const caras = cubosEnteros.map((c, i) => {
    const lista = [];
    for (let eje = 0; eje < 3; eje++) for (const s of [1, -1]) {
      if (es2D && !(eje === 2 && s === 1)) continue; // figura plana: solo el cuadrado frontal
      const vec = [c[0], c[1], c[2]]; vec[eje] += s;
      if (ocupados.has(clave(vec))) continue;
      const nrm = [0, 0, 0]; nrm[eje] = s;
      const u = [0, 0, 0], v = [0, 0, 0]; u[(eje + 1) % 3] = 0.5; v[(eje + 2) % 3] = 0.5;
      const base = centros[i].map((x, k) => x + nrm[k] * 0.5);
      const esq = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [0, 1, 2].map(k => base[k] + a * u[k] + b * v[k]));
      lista.push({ eje, signo: s, normal: nrm, esquinas: esq });
    }
    return lista;
  });
  return { cubosEnteros, centros, caras, radio, es2D: !!es2D };
};

const LUZ = (function () { const l = [-0.35, 0.75, 0.55]; const n = Math.hypot(...l); return l.map(x => x / n); })();

function hexARgb(h) { const x = parseInt(h.slice(1), 16); return [(x >> 16) & 255, (x >> 8) & 255, x & 255]; }
function mezclar(c1, c2, t) { const a = hexARgb(c1), b = hexARgb(c2); return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')'; }

// Color de cada cara visible según su orientación en la vista
function colorCaras(R, estilo) {
  const colores = {};
  const visibles = [];
  for (let eje = 0; eje < 3; eje++) for (const s of [1, -1]) {
    const n = [0, 0, 0]; n[eje] = s;
    const nv = M3.ap(R, n);
    if (nv[2] > 1e-6) visibles.push({ k: eje + '' + s, luz: nv[0] * LUZ[0] + nv[1] * LUZ[1] + nv[2] * LUZ[2] });
  }
  if (estilo.sombreado === 'lambert') {
    for (const v of visibles) colores[v.k] = mezclar(estilo.tonos[2], estilo.tonos[0], Math.max(0, Math.min(1, (v.luz + 0.25) / 1.2)));
  } else {
    visibles.sort((a, b) => b.luz - a.luz);
    visibles.forEach((v, i) => { colores[v.k] = estilo.tonos[Math.min(i, 2)]; });
  }
  return colores;
}

/**
 * Dibuja una figura.
 * fig: figura preparada · R: matriz 3×3 de vista (objeto → vista)
 * op: { cx, cy, escala, estilo, modoId (bool, para visibilidad), soloCubo (índice) }
 */
MR.dibujarFigura = function (ctx, fig, R, op) {
  const { cx, cy, escala } = op;
  const estilo = op.estilo || MR.CONFIG_BASE.estilo;
  const orden = fig.centros.map((c, i) => ({ i, z: M3.ap(R, c)[2] }));
  orden.sort((a, b) => a.z - b.z); // primero lo más lejano
  const colores = op.modoId ? null : (fig.es2D ? { '21': estilo.tonos[1], '2-1': estilo.tonos[1] } : colorCaras(op.matrizLuz || R, estilo));
  ctx.lineJoin = 'round';
  ctx.lineWidth = (estilo.grosorBorde || 1) * (op.factorBorde || 1);
  ctx.strokeStyle = estilo.borde;
  for (const { i } of orden) {
    if (op.soloCubo !== undefined && op.soloCubo !== i) continue;
    for (const cara of fig.caras[i]) {
      const nv = M3.ap(R, cara.normal);
      if (nv[2] <= 1e-6) continue; // cara de espaldas
      ctx.beginPath();
      cara.esquinas.forEach((p, k) => {
        const q = M3.ap(R, p);
        const x = cx + q[0] * escala, y = cy - q[1] * escala;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      if (op.modoId) {
        ctx.fillStyle = 'rgb(' + (i * 20 + 20) + ',' + (200 - i * 15) + ',90)';
        ctx.fill();
      } else {
        ctx.fillStyle = colores[cara.eje + '' + cara.signo];
        ctx.fill();
        ctx.stroke();
      }
    }
  }
};

/* ---------------- Visibilidad de cada cubo ---------------- */
let lienzoVis = null;
MR.visibilidad = function (fig, R) {
  const T = 140;
  if (!lienzoVis) { lienzoVis = document.createElement('canvas'); lienzoVis.width = T; lienzoVis.height = T; }
  const ctx = lienzoVis.getContext('2d', { willReadFrequently: true });
  const escala = (T / 2) * 0.92 / fig.radio;
  const contar = (soloCubo) => {
    ctx.clearRect(0, 0, T, T);
    MR.dibujarFigura(ctx, fig, R, { cx: T / 2, cy: T / 2, escala, modoId: true, soloCubo });
    const d = ctx.getImageData(0, 0, T, T).data;
    const cuenta = new Array(fig.centros.length).fill(0);
    for (let p = 0; p < d.length; p += 4) {
      if (d[p + 3] !== 255 || d[p + 2] !== 90) continue;
      const i = Math.round((d[p] - 20) / 20);
      if (i >= 0 && i < cuenta.length && d[p + 1] === 200 - i * 15) cuenta[i]++;
    }
    return cuenta;
  };
  const areaSolo = Math.max(1, contar(0)[0]); // en proyección ortográfica todos los cubos miden lo mismo
  const visibles = contar(undefined);
  const fr = visibles.map(c => Math.min(1, c / areaSolo));
  return { min: Math.min(...fr), porCubo: fr };
};

/* ---------------- Pose base de cada figura ---------------- */
// Elige una orientación de partida en la que se vean bien todos los cubos,
// tanto en la figura izquierda como en la derecha (con giro en profundidad y en espejo).
function elegirPose(fig, rng, cfg) {
  if (fig.es2D) { // figura plana: de frente, girada un múltiplo de 90° ± 15°
    const az = 90 * Math.floor(rng() * 4) + (rng() * 30 - 15);
    return { R: M3.rotZ(az), elev: 0, azim: az, rot24: -1 };
  }
  const S = M3.espejo(cfg.espejo);
  const d = cfg.giroProfundidadFijo || 0;
  const umbral = cfg.visibilidadMinima;
  const vis = (P) => MR.visibilidad(fig, P).min;
  let mejor = null;
  for (let t = 0; t < 300; t++) {
    const k = Math.floor(rng() * 24);
    const elev = 18 + rng() * 17;                                  // inclinación hacia el observador
    const azim = 45 + (rng() * 36 - 18) + 90 * Math.floor(rng() * 4); // evita vistas de frente
    const R = M3.cadena(M3.rotX(elev), M3.rotY(azim), MR.ROT24[k]);
    // Comprobaciones básicas, iguales en todas las condiciones (así todas usan las mismas figuras)
    const basicas = [R, M3.mul(M3.rotY(d), R), M3.cadena(M3.rotY(d), S, R)];
    if (!basicas.every(P => vis(P) >= umbral)) continue;
    const pose = { R, elev, azim, rot24: k };
    if (cfg.ejeRotacion !== 'profundidad') return pose;
    // Giro en profundidad: la oclusión cambia con el ángulo. Para cada ángulo y tipo se mira
    // el mejor de los dos sentidos de giro; la pose vale si en todos se ven todos los cubos.
    // Si ninguna lo consigue, se usa la mejor encontrada (y la visibilidad queda en los datos).
    let peor = 1;
    for (const a of cfg.angulos) {
      for (const B of [R, M3.mul(S, R)]) {
        const v = Math.max(...[1, -1].map(sg => vis(M3.cadena(M3.rotY(sg * a), M3.rotX(d), B))));
        peor = Math.min(peor, v);
        if (mejor && peor <= mejor.peor) break;
      }
      if (mejor && peor <= mejor.peor) break;
    }
    if (peor >= umbral) return pose;
    if (!mejor || peor > mejor.peor) mejor = Object.assign(pose, { peor });
    if (t > 150) break;
  }
  return mejor;
}

/* ---------------- Conjunto de figuras del experimento ---------------- */
const cacheConjuntos = {};
MR.generarConjunto = function (cfg) {
  const es2D = cfg.dimension === '2d';
  const claveCache = JSON.stringify([cfg.dimension || '3d', cfg.semilla, cfg.numFiguras, cfg.numFigurasPractica, cfg.cubosPorFigura,
    cfg.brazosPorFigura, cfg.pasosPorBrazo, cfg.visibilidadMinima, cfg.diferenciaMinimaCubos, cfg.espejo, cfg.giroProfundidadFijo,
    cfg.ejeRotacion === 'profundidad' ? cfg.angulos : null]);
  if (cacheConjuntos[claveCache]) return cacheConjuntos[claveCache];

  // Dos generadores aleatorios separados: las FORMAS dependen solo de la semilla y de los
  // parámetros de forma, así todas las condiciones usan las mismas figuras. Las POSES
  // usan otra semilla derivada de cada forma.
  const rng = MR.crearRng(cfg.semilla);
  const total = cfg.numFiguras + cfg.numFigurasPractica;
  const figuras = [];
  const vistas = new Set(), descartadas = new Set();
  let intentos = 0;
  while (figuras.length < total && intentos < 3000) {
    intentos++;
    const camino = generarCamino(rng, cfg);
    if (!camino) continue;
    const can = MR.formaCanonica(camino.cubos, es2D);
    const canEsp = MR.formaCanonica(MR.reflejarCubos(camino.cubos), es2D);
    if (can === canEsp) continue;         // aquiral: el espejo sería igual a la figura
    if (vistas.has(can) || descartadas.has(can)) continue; // repetida, espejo de otra o ya descartada
    const maxSolape = cfg.cubosPorFigura - (cfg.diferenciaMinimaCubos || 0);
    if (figuras.some(f => MR.solapamientoMaximo(f.cubosEnteros, camino.cubos) > maxSolape)) { // demasiado parecida
      descartadas.add(can); descartadas.add(canEsp); continue;
    }
    const fig = MR.prepararFigura(camino.cubos, es2D);
    const pose = elegirPose(fig, MR.crearRng(MR.hashTexto(cfg.semilla + '|' + can)), cfg);
    if (!pose) { descartadas.add(can); descartadas.add(canEsp); continue; }
    vistas.add(can); vistas.add(canEsp);
    const practica = figuras.length >= cfg.numFiguras;
    const n = practica ? figuras.length - cfg.numFiguras + 1 : figuras.length + 1;
    fig.id = practica ? 'P' + n : 'F' + n;
    fig.practica = practica;
    fig.pose = pose.R;
    fig.poseInfo = { elevacion: +pose.elev.toFixed(1), azimut: +pose.azim.toFixed(1), rot24: pose.rot24 };
    fig.pasos = camino.pasos;
    figuras.push(fig);
  }
  if (figuras.length < total) throw new Error('No se pudieron generar suficientes figuras. Cambia la semilla o los parámetros.');
  const radioMax = Math.max(...figuras.map(f => f.radio));
  const conjunto = { figuras, radioMax, porId: Object.fromEntries(figuras.map(f => [f.id, f])) };
  cacheConjuntos[claveCache] = conjunto;
  return conjunto;
};

/* ---------------- Matrices de un par ---------------- */
// Devuelve la matriz de la figura izquierda (pose base) y la de la derecha
// (espejo opcional + pequeño giro en profundidad + giro del ángulo indicado).
MR.matricesPar = function (fig, ensayo, cfg) {
  const R = fig.pose;
  if (fig.es2D) { // figura plana: espejo + giro en el plano, sin giro en profundidad
    const base = ensayo.tipo === 'espejo' ? M3.mul(M3.espejo(cfg.espejo), R) : R;
    return { izq: R, der: M3.mul(M3.rotZ(ensayo.angulo * (ensayo.signo || 1)), base), luzDer: null };
  }
  const d = cfg.giroProfundidadFijo || 0;
  const S = M3.espejo(cfg.espejo);
  const base = ensayo.tipo === 'espejo' ? M3.mul(S, R) : R;
  const ang = ensayo.angulo * (ensayo.signo || 1);
  let der, luzDer = null;
  if (ensayo.eje === 'profundidad') der = M3.cadena(M3.rotY(ang), M3.rotX(d), base);
  else if (ensayo.eje === 'aleatorio') der = M3.cadena(M3.rotEje(ensayo.vectorEje, ang), M3.rotY(d), base);
  else {
    der = M3.cadena(M3.rotZ(ang), M3.rotY(d), base);
    // Giro en el plano: por defecto la iluminación gira con la imagen (como girar una foto),
    // para que a 150° la figura no parezca iluminada desde abajo (eso sería otra dificultad).
    if (cfg.estilo.luzGiraConImagen !== false) luzDer = M3.cadena(M3.rotY(d), base);
  }
  return { izq: R, der, luzDer };
};

// Dibuja el par completo en dos lienzos (o en uno, si lienzoDer es null)
MR.escalaPara = function (tam, conjunto) { return (tam / 2) * 0.97 / conjunto.radioMax; };

MR.dibujarEnLienzo = function (canvas, fig, R, cfg, conjunto, tamCss, matrizLuz) {
  const dpr = window.devicePixelRatio || 1;
  const tam = tamCss;
  if (canvas.width !== Math.round(tam * dpr)) { canvas.width = Math.round(tam * dpr); canvas.height = Math.round(tam * dpr); }
  canvas.style.width = tam + 'px'; canvas.style.height = tam + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = cfg.estilo.fondo; ctx.fillRect(0, 0, tam, tam);
  if (fig) MR.dibujarFigura(ctx, fig, R, { cx: tam / 2, cy: tam / 2, escala: MR.escalaPara(tam, conjunto), estilo: cfg.estilo, factorBorde: Math.max(0.8, tam / 320), matrizLuz });
};

// Dibuja el par de un ensayo en dos lienzos
MR.dibujarPar = function (lienzoIzq, lienzoDer, conjunto, ensayo, cfg, tam) {
  const fig = conjunto.porId[ensayo.figura];
  const m = MR.matricesPar(fig, ensayo, cfg);
  MR.dibujarEnLienzo(lienzoIzq, fig, m.izq, cfg, conjunto, tam);
  MR.dibujarEnLienzo(lienzoDer, fig, m.der, cfg, conjunto, tam, m.luzDer);
};

// Máscara visual: caras de cubos dispersas al azar
MR.dibujarMascara = function (canvas, cfg, rng, tamCss) {
  const dpr = window.devicePixelRatio || 1;
  const tam = tamCss;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = cfg.estilo.fondo; ctx.fillRect(0, 0, tam, tam);
  ctx.strokeStyle = cfg.estilo.borde; ctx.lineWidth = cfg.estilo.grosorBorde;
  const lado = tam / 9;
  for (let k = 0; k < 70; k++) {
    const x = rng() * tam, y = rng() * tam, a = rng() * Math.PI, b = a + Math.PI / 2 + (rng() - 0.5) * 0.9;
    const u = [Math.cos(a) * lado, Math.sin(a) * lado * 0.6], v = [Math.cos(b) * lado, Math.sin(b) * lado * 0.6];
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + u[0], y + u[1]); ctx.lineTo(x + u[0] + v[0], y + u[1] + v[1]); ctx.lineTo(x + v[0], y + v[1]); ctx.closePath();
    ctx.fillStyle = cfg.estilo.tonos[Math.floor(rng() * 3)]; ctx.fill(); ctx.stroke();
  }
};
