/* =====================================================================
 *  LISTA DE PARES (ENSAYOS)
 * ---------------------------------------------------------------------
 *  Diseño equilibrado: cada combinación ángulo × tipo (igual/espejo)
 *  tiene `ensayosPorCelda` pares, y las figuras se reparten por rotación
 *  para que cada figura salga el mismo número de veces.
 *  Los distractores se asignan también de forma equilibrada por celda.
 * ===================================================================== */
window.MR = window.MR || {};

function signoGiro(cfg, k) {
  if (cfg.sentidoGiro === 'horario') return -1;
  if (cfg.sentidoGiro === 'antihorario') return 1;
  return k % 2 === 0 ? 1 : -1; // alternado dentro de cada celda = equilibrado
}

function ejeAleatorio(rng) {
  // vector unitario uniforme en la esfera
  const z = rng() * 2 - 1, t = rng() * 2 * Math.PI, r = Math.sqrt(1 - z * z);
  return [r * Math.cos(t), r * Math.sin(t), z].map(v => +v.toFixed(4));
}

// Marca n = round(prob * total) elementos de forma equilibrada
function marcarEquilibrado(lista, prob, rng) {
  const n = Math.round(prob * lista.length);
  const idx = MR.barajar(lista.map((_, i) => i), rng).slice(0, n);
  const set = new Set(idx);
  return lista.map((_, i) => set.has(i));
}

// Reordena respetando: no más de `maxTipo` pares seguidos del mismo tipo
// y que la misma figura no salga dos veces seguidas.
function ordenarConRestricciones(lista, rng, maxTipo) {
  let mejor = null;
  for (let t = 0; t < 3000; t++) {
    const a = MR.barajar(lista, rng);
    let ok = true, racha = 1;
    for (let i = 1; i < a.length && ok; i++) {
      if (a[i].figura === a[i - 1].figura) ok = false;
      racha = a[i].tipo === a[i - 1].tipo ? racha + 1 : 1;
      if (maxTipo && racha > maxTipo) ok = false;
    }
    if (ok) return a;
    if (!mejor) mejor = a;
  }
  return mejor;
}

MR.construirEnsayos = function (cfg, conjunto, semillaOrden) {
  if (cfg.dimension === '2d') cfg = Object.assign({}, cfg, { ejeRotacion: 'plano' }); // en 2D solo hay giro en el plano
  const rngDiseno = MR.crearRng(cfg.semilla + 7);
  const rngOrden = MR.crearRng(semillaOrden);
  const figsTest = conjunto.figuras.filter(f => !f.practica);
  const tipos = ['igual', 'espejo'];

  /* ---- Test ---- */
  let lista = [];
  let celda = 0;
  for (const angulo of cfg.angulos) for (const tipo of tipos) {
    const grupo = [];
    for (let k = 0; k < cfg.ensayosPorCelda; k++) {
      const fig = figsTest[(celda + k) % figsTest.length];
      grupo.push({
        bloque: 'test', figura: fig.id, angulo, tipo,
        signo: angulo === 0 ? 1 : signoGiro(cfg, k),
        eje: cfg.ejeRotacion,
        vectorEje: cfg.ejeRotacion === 'aleatorio' ? ejeAleatorio(rngDiseno) : null
      });
    }
    // distractores equilibrados dentro de cada celda
    const ds = cfg.distractorSonoro.activo ? marcarEquilibrado(grupo, cfg.distractorSonoro.probabilidad, rngDiseno) : grupo.map(() => false);
    const dv = cfg.distractorVisual.activo ? marcarEquilibrado(grupo, cfg.distractorVisual.probabilidad, rngDiseno) : grupo.map(() => false);
    grupo.forEach((e, i) => { e.conDistractorSonoro = ds[i]; e.conDistractorVisual = dv[i]; });
    lista = lista.concat(grupo);
    celda++;
  }
  lista = ordenarConRestricciones(lista, rngOrden, cfg.maxMismoTipoSeguidos);
  lista.forEach((e, i) => { e.ensayo = i + 1; });

  /* ---- Práctica ---- */
  let practica = [];
  if (cfg.practica.activa) {
    const figsP = conjunto.figuras.filter(f => f.practica);
    let k = 0;
    cfg.practica.angulos.forEach((angulo, ia) => tipos.forEach((tipo, it) => {
      practica.push({
        // (ia + it) alterna la figura entre tipos: ninguna figura es siempre "igual" o siempre "espejo"
        bloque: 'practica', figura: figsP[(ia + it) % figsP.length].id, angulo, tipo,
        signo: angulo === 0 ? 1 : (k % 2 ? -1 : 1), eje: cfg.ejeRotacion,
        vectorEje: cfg.ejeRotacion === 'aleatorio' ? ejeAleatorio(rngDiseno) : null,
        conDistractorSonoro: false, conDistractorVisual: false
      });
      k++;
    }));
    practica = MR.barajar(practica, MR.crearRng(cfg.semilla + 3));
    practica.forEach((e, i) => { e.ensayo = i + 1; });
  }

  // En giro en profundidad, si un sentido tapa demasiado algún cubo se usa el contrario
  if (cfg.ejeRotacion === 'profundidad') {
    for (const e of practica.concat(lista)) {
      if (e.angulo === 0) continue;
      const fig = conjunto.porId[e.figura];
      const v1 = MR.visibilidad(fig, MR.matricesPar(fig, e, cfg).der).min;
      if (v1 < cfg.visibilidadMinima) {
        const alt = Object.assign({}, e, { signo: -e.signo });
        const v2 = MR.visibilidad(fig, MR.matricesPar(fig, alt, cfg).der).min;
        if (v2 > v1) e.signo = -e.signo;
      }
    }
  }
  // visibilidad mínima de la figura derecha (dato de control)
  for (const e of practica.concat(lista)) {
    const fig = conjunto.porId[e.figura];
    e.visibilidadMin = +MR.visibilidad(fig, MR.matricesPar(fig, e, cfg).der).min.toFixed(3);
  }
  return { test: lista, practica };
};
