/* =====================================================================
 *  SESIONES: orden de los tests, códigos y agrupación
 * ---------------------------------------------------------------------
 *  Una "sesión completa" son varios tests seguidos con el mismo
 *  participante (test normal, test con distracción y control 2D), en un
 *  orden que cambia de un participante a otro
 *  (contrabalanceo). Cada test se guarda como una sesión propia, con su
 *  condición, y todas comparten el mismo `grupo` (columna
 *  `sesion_completa` del CSV), el orden (`orden_bloques`) y la posición
 *  de cada test (`posicion_bloque`).
 * ===================================================================== */
window.MR = window.MR || {};

MR.NOMBRES_CORTOS = {
  sin_limite: 'Test normal (Estudio 1)',
  distraccion: 'Test con distracción (Estudio 2)',
  control_2d: 'Control 2D',
  secuencial: 'Secuencial (retirado)',
  // diseño anterior al 18/11/2026 (por si aparecen en datos antiguos)
  distractor_sonoro: 'Antiguo · distractor sonoro',
  distractor_visual: 'Antiguo · distractor visual',
  exposicion_breve: 'Antiguo · exposición breve'
};
// Para escribir órdenes: «Normal → Distracción»
MR.NOMBRES_MINI = { sin_limite: 'Normal', distraccion: 'Distracción', control_2d: '2D', secuencial: 'Secuencial' };

// ¿El bloque usa sonido / imágenes de distracción? (para avisos y para la comprobación de sonido)
MR.usaSonido = function (clave) {
  const c = MR.configDeCondicion(clave);
  return !!((c.distraccion && c.distraccion.activa && c.distraccion.sonido) || (c.distractorSonoro && c.distractorSonoro.activo));
};
MR.usaImagen = function (clave) {
  const c = MR.configDeCondicion(clave);
  return !!((c.distraccion && c.distraccion.activa && c.distraccion.imagen) || (c.distractorVisual && c.distractorVisual.activo));
};

// 'sin_limite_demo' → 'sin_limite'
MR.claveBase = (c) => String(c || '').replace(/(_demo|_personalizada)+$/, '');

MR.nombreCorto = function (condicion) {
  const k = MR.claveBase(condicion);
  const base = MR.NOMBRES_CORTOS[k] || (MR.CONDICIONES[k] ? MR.CONDICIONES[k].nombre : condicion);
  return base + (/_personalizada/.test(condicion) ? ' (personalizada)' : '') + (/_demo/.test(condicion) ? ' (demo)' : '');
};

/* ---------- orden de los tests (contrabalanceo) ---------- */
MR.numeroDeCodigo = (codigo) => { const m = String(codigo || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : null; };

function aleatorioSeguro(n) {
  try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
  catch (e) { return Math.floor(Math.random() * n); }
}

// Tests de la sesión, en su orden de referencia: [normal, distracción, 2D]
MR.bloquesSesion = function ({ normal = true, distraccion = true, control2D = true } = {}) {
  return [].concat(normal ? ['sin_limite'] : [], distraccion ? ['distraccion'] : [], control2D ? ['control_2d'] : []);
};

// Todas las permutaciones, en un orden fijo. [A, B] → [[A, B], [B, A]]. Con 3 tests salen 6, y al
// rotarlas con el número de participante cada test cae el mismo número de veces en cada posición.
MR.ordenesPosibles = function (bloques) {
  if (bloques.length <= 1) return [bloques.slice()];
  const out = [];
  bloques.forEach((b, i) => {
    MR.ordenesPosibles(bloques.filter((_, j) => j !== i)).forEach(resto => out.push([b].concat(resto)));
  });
  return out;
};

// Laboratorio: el orden depende del número del código (P01 → 1.ª permutación, P02 → 2.ª…)
MR.ordenPorCodigo = function (codigo, bloques) {
  const ordenes = MR.ordenesPosibles(bloques), n = MR.numeroDeCodigo(codigo);
  return ordenes[n ? (n - 1) % ordenes.length : 0];
};
MR.indiceOrdenPorCodigo = function (codigo, bloques) {
  const n = MR.numeroDeCodigo(codigo);
  return n ? (n - 1) % MR.ordenesPosibles(bloques).length : 0;
};

// Online: un orden al azar
MR.ordenAleatorio = function (bloques) {
  const ordenes = MR.ordenesPosibles(bloques);
  return ordenes[aleatorioSeguro(ordenes.length)];
};

// 'sin_limite>distraccion' (lo que se guarda) y «Normal → Distracción» (lo que se enseña)
MR.textoOrden = (plan) => plan.map(MR.claveBase).join('>');
MR.nombreOrden = (plan) => (Array.isArray(plan) ? plan : String(plan || '').split('>')).filter(Boolean)
  .map(k => MR.NOMBRES_MINI[MR.claveBase(k)] || k).join(' → ');

// Minutos aproximados: ~4 s por par (cruz + respuesta), más lo que dura la primera figura en la
// presentación secuencial, ~1 min de instrucciones y práctica en el primer bloque y ~0,5 en los demás
MR.minutosEstimados = function (plan, ajustes) {
  return plan.reduce((t, k, i) => {
    let cfg = MR.configDeCondicion(k);
    if (ajustes) cfg = MR.mezclarProfundo(cfg, ajustes);
    const s = cfg.secuencial || {};
    const extra = cfg.presentacion === 'secuencial' ? ((s.primeraMs || 0) + (s.mascaraMs || 0) + (s.intervaloMs || 0)) / 1000 : 0;
    return t + (i === 0 ? 1 : 0.5) + cfg.angulos.length * 2 * cfg.ensayosPorCelda * (4 + extra) / 60;
  }, 0);
};

/* ---------- códigos ---------- */
// Código anónimo aleatorio (sin letras que se confunden: O/0, I/1)
MR.codigoAleatorio = function (prefijo = 'W', n = 5) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = prefijo;
  for (let i = 0; i < n; i++) s += abc[aleatorioSeguro(abc.length)];
  return s;
};

MR.idSesionCompleta = (codigo) => codigo + '_' + Date.now().toString(36);

// Siguiente código libre del laboratorio (P01, P02…) según lo guardado en este navegador
MR.siguienteCodigoLab = function () {
  let max = 0;
  for (const s of MR.Almacen.todas()) {
    const m = /^P(\d+)$/i.exec((s.participante && s.participante.codigo) || '');
    if (m && !s.prueba) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'P' + String(max + 1).padStart(2, '0');
};

/* ---------- agrupar bloques en sesiones completas ---------- */
MR.agruparSesiones = function (sesiones) {
  const grupos = new Map();
  for (const s of sesiones) {
    const k = s.grupo || s.id;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(s);
  }
  return [...grupos.entries()].map(([id, ss]) => {
    ss.sort((a, b) => (a.posicion_bloque || 0) - (b.posicion_bloque || 0) || String(a.inicio).localeCompare(String(b.inicio)));
    return {
      id, sesiones: ss, sujeto: ss[0].participante.codigo, inicio: ss[0].inicio,
      modalidad: ss[0].modalidad || 'laboratorio', prueba: ss.some(s => s.prueba),
      orden: ss[0].orden_bloques || ss[0].orden_estudio2 || ''
    };
  }).sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)));
};
