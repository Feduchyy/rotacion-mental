/* =====================================================================
 *  EXPORTACIÓN DE ESTÍMULOS PARA IA
 *  1) Set del test: los mismos pares que ven los humanos.
 *  2) Dataset de entrenamiento: figuras nuevas, excluyendo las del test.
 * ===================================================================== */
(function () {
  const $ = (id) => document.getElementById(id);
  // Cede el control al navegador para que la página no se congele. Usa MessageChannel en vez de
  // setTimeout porque los temporizadores se ralentizan mucho si la pestaña queda en segundo plano.
  const canal = new MessageChannel(), enEspera = [];
  canal.port1.onmessage = () => { const r = enEspera.shift(); if (r) r(); };
  const pausa = () => new Promise(r => { enEspera.push(r); canal.port2.postMessage(0); });

  /* ---------------- prompts ---------------- */
  const PROMPT_ES = 'Vas a ver dos figuras tridimensionales hechas de cubos, una a la izquierda y otra a la derecha. ' +
    'La figura de la derecha está girada respecto a la de la izquierda. Puede ser la MISMA figura girada, ' +
    'o su IMAGEN EN ESPEJO girada: una imagen en espejo no se puede hacer coincidir con la original con ningún giro ' +
    '(como una mano izquierda y una mano derecha).\n\n' +
    '¿Son la misma figura o una es la imagen en espejo de la otra? Responde únicamente con una palabra: igual o espejo.';
  const PROMPT_EN = 'You will see two three-dimensional figures made of cubes, one on the left and one on the right. ' +
    'The figure on the right is rotated relative to the one on the left. It can be the SAME figure rotated, ' +
    'or its MIRROR IMAGE rotated: a mirror image cannot be made to match the original by any rotation ' +
    '(like a left hand and a right hand).\n\n' +
    'Are they the same figure, or is one the mirror image of the other? Answer with a single word: same or mirror.';
  const PROMPT_RAZONADO_ES = PROMPT_ES.replace('Responde únicamente con una palabra: igual o espejo.',
    'Razona paso a paso y termina tu respuesta con una línea exactamente así: "Respuesta: igual" o "Respuesta: espejo".');
  const PROMPT_SEPARADAS_ES = PROMPT_ES.replace('una a la izquierda y otra a la derecha', 'en dos imágenes: la primera es la figura de la izquierda y la segunda la de la derecha')
    .replace('La figura de la derecha', 'La figura de la segunda imagen').replace('respecto a la de la izquierda', 'respecto a la de la primera');

  // Adapta los prompts a figuras planas (control 2D)
  function promptsPara(cfg) {
    const p = { es: PROMPT_ES, es_razonado: PROMPT_RAZONADO_ES, es_imagenes_separadas: PROMPT_SEPARADAS_ES, en: PROMPT_EN };
    if (cfg.dimension === '2d') {
      for (const k of ['es', 'es_razonado', 'es_imagenes_separadas']) p[k] = p[k].replace('dos figuras tridimensionales hechas de cubos', 'dos figuras planas hechas de cuadrados');
      p.en = p.en.replace('two three-dimensional figures made of cubes', 'two flat figures made of squares');
    }
    return p;
  }

  /* ---------------- dibujo en imagen ---------------- */
  function lienzoFigura(fig, R, luz, cfg, radioMax, tam) {
    const c = document.createElement('canvas'); c.width = tam; c.height = tam;
    const g = c.getContext('2d');
    g.fillStyle = cfg.estilo.fondo; g.fillRect(0, 0, tam, tam);
    MR.dibujarFigura(g, fig, R, { cx: tam / 2, cy: tam / 2, escala: (tam / 2) * 0.97 / radioMax, estilo: cfg.estilo, factorBorde: Math.max(0.6, tam / 320), matrizLuz: luz });
    return c;
  }
  function lienzoPar(izq, der) {
    const tam = izq.width, hueco = Math.round(tam * 0.1);
    const c = document.createElement('canvas'); c.width = tam * 2 + hueco; c.height = tam;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(izq, 0, 0); g.drawImage(der, tam + hueco, 0);
    g.strokeStyle = '#d5dedc'; g.lineWidth = Math.max(1, tam / 200);
    g.strokeRect(0.5, 0.5, tam - 1, tam - 1); g.strokeRect(tam + hueco + 0.5, 0.5, tam - 1, tam - 1);
    return c;
  }
  // PNG síncrono (toDataURL): más rápido y estable que toBlob en exportaciones de miles de imágenes
  function aPng(c) {
    const bin = atob(c.toDataURL('image/png').split(',')[1]);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  const coords = (fig, R) => fig.centros.map(p => MR.M3.ap(R, p).map(v => +v.toFixed(3)));
  const csv = (cols, filas) => [cols.join(',')].concat(filas.map(f => cols.map(k => f[k] === undefined || f[k] === null ? '' : String(f[k]).includes(',') ? `"${f[k]}"` : f[k]).join(','))).join('\n') + '\n';
  function progreso(id, frac) { const p = $(id); p.style.display = frac === null ? 'none' : 'block'; p.firstElementChild.style.width = (100 * (frac || 0)) + '%'; }

  /* ================== 1. SET DEL TEST ================== */
  const sel = $('t-condicion');
  for (const [k, c] of Object.entries(MR.CONDICIONES)) {
    const o = document.createElement('option'); o.value = k; o.textContent = c.nombre; sel.appendChild(o);
  }
  const params = new URLSearchParams(location.search);
  sel.value = MR.CONDICIONES[params.get('condicion')] ? params.get('condicion') : 'sin_limite';

  function datosTest() {
    const cfg = MR.configDeCondicion(sel.value);
    const conjunto = MR.generarConjunto(cfg);
    const listas = MR.construirEnsayos(cfg, conjunto, cfg.semilla + 1); // mismo orden que los humanos con ordenFijo
    return { cfg, conjunto, listas };
  }

  function vistaPreviaTest() {
    const { cfg, conjunto, listas } = datosTest();
    const todos = ($('t-practica').checked ? listas.practica : []).concat(listas.test);
    $('t-info').textContent = `${listas.test.length} pares de test` + ($('t-practica').checked ? ` + ${listas.practica.length} de práctica` : '') +
      ` · ${conjunto.figuras.filter(f => !f.practica).length} figuras · semilla ${cfg.semilla}` +
      (cfg.ordenFijo ? ' · mismo orden que los participantes' : ' · ¡ojo! ordenFijo = false: los humanos ven otro orden');
    const gal = $('t-galeria'); gal.innerHTML = '';
    gal.classList.toggle('oculta-clave', !$('t-clave').checked);
    for (const e of todos) {
      const fig = conjunto.porId[e.figura], m = MR.matricesPar(fig, e, cfg);
      const par = lienzoPar(lienzoFigura(fig, m.izq, null, cfg, conjunto.radioMax, 120), lienzoFigura(fig, m.der, m.luzDer, cfg, conjunto.radioMax, 120));
      const d = document.createElement('div'); d.className = 'item';
      d.appendChild(par);
      d.insertAdjacentHTML('beforeend', `<div class="etq"><span>${e.bloque === 'practica' ? 'P' : '#'}${e.ensayo} · ${e.figura} · ${e.angulo * e.signo}°</span><span class="clave ${e.tipo}">${e.tipo}</span></div>`);
      gal.appendChild(d);
    }
  }

  async function exportarTest() {
    const btn = $('t-exportar'); btn.disabled = true;
    try {
      const { cfg, conjunto, listas } = datosTest();
      const tam = Math.max(32, +$('t-tam').value || 320), modo = $('t-modo').value;
      const todos = ($('t-practica').checked ? listas.practica : []).concat(listas.test);
      const zip = new MR.Zip(), filas = [], json = [];
      for (let i = 0; i < todos.length; i++) {
        const e = todos[i], fig = conjunto.porId[e.figura], m = MR.matricesPar(fig, e, cfg);
        const id = e.bloque === 'practica' ? `practica_${e.ensayo}` : `par_${String(e.ensayo).padStart(3, '0')}`;
        const cI = lienzoFigura(fig, m.izq, null, cfg, conjunto.radioMax, tam);
        const cD = lienzoFigura(fig, m.der, m.luzDer, cfg, conjunto.radioMax, tam);
        const fila = { id, bloque: e.bloque, ensayo: e.ensayo, figura: e.figura, angulo: e.angulo, signo_giro: e.signo, eje: e.eje, respuesta_correcta: e.tipo, visibilidad_min: e.visibilidadMin };
        if (modo !== 'separadas') { fila.archivo_par = `imagenes/${id}.png`; zip.agregar(fila.archivo_par, await aPng(lienzoPar(cI, cD))); }
        if (modo !== 'par') {
          fila.archivo_izq = `imagenes_separadas/${id}_izq.png`; fila.archivo_der = `imagenes_separadas/${id}_der.png`;
          zip.agregar(fila.archivo_izq, await aPng(cI)); zip.agregar(fila.archivo_der, await aPng(cD));
        }
        filas.push(fila);
        json.push(Object.assign({}, fila, { vector_eje: e.vectorEje, cubos_izq_vista: coords(fig, m.izq), cubos_der_vista: coords(fig, m.der) }));
        progreso('t-prog', (i + 1) / todos.length);
        if (i % 4 === 0) await pausa();
      }
      const cols = ['id', 'bloque', 'ensayo', 'archivo_par', 'archivo_izq', 'archivo_der', 'figura', 'angulo', 'signo_giro', 'eje', 'respuesta_correcta', 'visibilidad_min'];
      zip.agregar('manifiesto.csv', csv(cols, filas));
      zip.agregar('manifiesto.json', JSON.stringify({
        generado: new Date().toISOString(), condicion: cfg.condicion, config: cfg,
        nota_coordenadas: 'Centros de los cubos tal como se ven: x a la derecha, y hacia arriba, z hacia el observador (unidades = arista del cubo).',
        figuras: conjunto.figuras.map(f => ({ id: f.id, practica: f.practica, cubos: f.cubosEnteros })),
        pares: json
      }, null, 1));
      for (const [k, txt] of Object.entries(promptsPara(cfg))) zip.agregar(`prompt_${k}.txt`, txt + '\n');
      zip.agregar('LEEME.txt', [
        'ESTÍMULOS DEL TEST DE ROTACIÓN MENTAL PARA MODELOS DE IA',
        `Condición: ${cfg.condicion} · semilla ${cfg.semilla} · generado ${new Date().toLocaleString('es-ES')}`,
        '',
        'imagenes/par_XXX.png          Par completo (izquierda | derecha), como lo ve el participante.',
        'imagenes_separadas/*_izq|der  Cada figura por separado (para modelos que aceptan varias imágenes).',
        'practica_N                    Pares de práctica (figuras que no salen en el test): úsalos como ejemplos few-shot.',
        'manifiesto.csv                Una fila por par: archivo(s), figura, ángulo, sentido, respuesta_correcta (igual/espejo).',
        'manifiesto.json               Lo mismo + configuración completa + coordenadas 3D de los cubos (para una versión en texto).',
        'prompt_*.txt                  Consigna equivalente a la de los humanos.',
        '',
        'Recomendaciones (Documento 1, P6): una consulta por par en conversación nueva, sin memoria entre pares;',
        'anotar modelo, versión, fecha, temperatura y repeticiones; los nombres de archivo no revelan la respuesta.'
      ].join('\n') + '\n');
      MR.descargar(`estimulos_IA_${cfg.condicion}_${tam}px.zip`, zip.generar());
    } catch (err) { alert('Error al exportar: ' + err.message); console.error(err); }
    progreso('t-prog', null); btn.disabled = false;
  }

  [sel, $('t-practica'), $('t-clave')].forEach(x => x.addEventListener('change', vistaPreviaTest));
  $('t-exportar').addEventListener('click', exportarTest);
  vistaPreviaTest();

  /* ================== 2. DATASET DE ENTRENAMIENTO ================== */
  function rango(txt, def) { const m = String(txt).match(/(\d+)\s*[-–a]\s*(\d+)/); return m ? [Math.min(+m[1], +m[2]), Math.max(+m[1], +m[2])] : def; }

  function opcionesDataset() {
    return {
      n: Math.max(1, +$('d-n').value || 2000), tam: Math.max(32, +$('d-tam').value || 128), modo: $('d-modo').value,
      eje: $('d-eje').value, amin: +$('d-amin').value || 0, amax: Math.min(180, +$('d-amax').value || 180),
      nFiguras: Math.max(2, +$('d-nfig').value || 60), cubos: rango($('d-cubos').value, [8, 12]), brazos: rango($('d-brazos').value, [3, 5]),
      fracVal: Math.min(0.9, Math.max(0, +$('d-val').value || 0)), semilla: +$('d-semilla').value || 777,
      dim: $('d-dim').value
    };
  }

  // Figuras de entrenamiento: distintas de las del test (ni ellas ni sus espejos)
  function poolFiguras(op, cfgBase) {
    const es2D = cfgBase.dimension === '2d';
    const conjTest = MR.generarConjunto(cfgBase);
    const prohibidas = new Set();
    for (const f of conjTest.figuras) { prohibidas.add(MR.formaCanonica(f.cubosEnteros, es2D)); prohibidas.add(MR.formaCanonica(MR.reflejarCubos(f.cubosEnteros), es2D)); }
    const rng = MR.crearRng(op.semilla), vistas = new Set(), figs = [];
    let intentos = 0;
    while (figs.length < op.nFiguras && intentos < op.nFiguras * 300) {
      intentos++;
      const nC = op.cubos[0] + Math.floor(rng() * (op.cubos[1] - op.cubos[0] + 1));
      const nB = op.brazos[0] + Math.floor(rng() * (op.brazos[1] - op.brazos[0] + 1));
      const lim = { min: 2, max: 5, minExtremos: 1 };
      if (2 * lim.minExtremos + (nB - 2) * lim.min > nC - 1 || nB * lim.max < nC - 1) continue; // combinación imposible
      const camino = MR.generarCamino(rng, { cubosPorFigura: nC, brazosPorFigura: nB, pasosPorBrazo: lim, dimension: cfgBase.dimension });
      if (!camino) continue;
      const can = MR.formaCanonica(camino.cubos, es2D), canE = MR.formaCanonica(MR.reflejarCubos(camino.cubos), es2D);
      if (can === canE || prohibidas.has(can) || vistas.has(can)) continue;
      const fig = MR.prepararFigura(camino.cubos, es2D);
      // Solo figuras que caben en el mismo marco que las del test: así el cubo mide lo mismo
      // en píxeles en el entrenamiento y en el test (las redes convolucionales no son invariantes a la escala).
      if (fig.radio > conjTest.radioMax) continue;
      vistas.add(can); vistas.add(canE);
      fig.id = 'E' + (figs.length + 1); fig.nCubos = nC; fig.nBrazos = nB;
      figs.push(fig);
    }
    const nVal = Math.round(figs.length * op.fracVal);
    figs.forEach((f, i) => { f.particion = i >= figs.length - nVal ? 'val' : 'train'; });
    return { figs, radioMax: conjTest.radioMax, avisos: figs.length < op.nFiguras ? `Solo se encontraron ${figs.length} figuras distintas con esos parámetros.` : '' };
  }

  // Pose de partida al azar (misma distribución que el test) con todos los cubos visibles
  function poseAleatoria(fig, rng, umbral) {
    if (fig.es2D) return MR.M3.rotZ(rng() * 360); // figura plana: cualquier giro en el plano
    let mejor = null, mejorV = -1;
    for (let t = 0; t < 40; t++) {
      const R = MR.M3.cadena(MR.M3.rotX(18 + rng() * 17), MR.M3.rotY(45 + (rng() * 36 - 18) + 90 * Math.floor(rng() * 4)), MR.ROT24[Math.floor(rng() * 24)]);
      const v = MR.visibilidad(fig, R).min;
      if (v >= umbral) return R;
      if (v > mejorV) { mejorV = v; mejor = R; }
    }
    return mejor;
  }

  function* paresDataset(op, pool, cfgBase) {
    const rng = MR.crearRng(op.semilla + 1);
    const ejes = op.eje === 'mezcla' ? ['plano', 'profundidad', 'aleatorio'] : [op.eje];
    for (let i = 0; i < op.n; i++) {
      const fig = pool.figs[Math.floor(rng() * pool.figs.length)];
      const pose = poseAleatoria(fig, rng, cfgBase.visibilidadMinima);
      const eje = fig.es2D ? 'plano' : ejes[Math.floor(rng() * ejes.length)];
      const e = {
        figura: fig.id, tipo: rng() < 0.5 ? 'igual' : 'espejo',
        angulo: Math.round(op.amin + rng() * (op.amax - op.amin)), signo: rng() < 0.5 ? 1 : -1, eje,
        vectorEje: eje === 'aleatorio' ? (() => { const z = rng() * 2 - 1, t = rng() * 2 * Math.PI, r = Math.sqrt(1 - z * z); return [r * Math.cos(t), r * Math.sin(t), z].map(v => +v.toFixed(4)); })() : null
      };
      const m = MR.matricesPar(Object.assign({}, fig, { pose }), e, cfgBase);
      yield { i, fig, e, m };
    }
  }

  function preparaDataset() {
    const op = opcionesDataset();
    const cfgBase = MR.configDeCondicion(op.dim === '2d' ? 'control_2d' : 'sin_limite');
    const pool = poolFiguras(op, cfgBase);
    const nTrain = pool.figs.filter(f => f.particion === 'train').length;
    $('d-info').textContent = `${pool.figs.length} figuras nuevas (${nTrain} de entrenamiento, ${pool.figs.length - nTrain} de validación), excluyendo las 10 del test${op.dim === '2d' ? ' 2D' : ''} y sus espejos. ` + pool.avisos;
    return { op, cfgBase, pool };
  }

  $('d-muestra').addEventListener('click', () => {
    const { op, cfgBase, pool } = preparaDataset();
    const gal = $('d-galeria'); gal.innerHTML = '';
    for (const { fig, e, m } of paresDataset(Object.assign({}, op, { n: 24 }), pool, cfgBase)) {
      const par = lienzoPar(lienzoFigura(fig, m.izq, null, cfgBase, pool.radioMax, 120), lienzoFigura(fig, m.der, m.luzDer, cfgBase, pool.radioMax, 120));
      const d = document.createElement('div'); d.className = 'item'; d.appendChild(par);
      d.insertAdjacentHTML('beforeend', `<div class="etq"><span>${fig.id} (${fig.particion}) · ${e.eje} ${e.angulo * e.signo}°</span><span class="clave ${e.tipo}">${e.tipo}</span></div>`);
      gal.appendChild(d);
    }
  });

  $('d-exportar').addEventListener('click', async () => {
    const btn = $('d-exportar'); btn.disabled = true;
    try {
      const { op, cfgBase, pool } = preparaDataset();
      if (op.n * (op.modo === 'par' ? 1 : 2) > 40000 && !confirm('Son muchas imágenes y el ZIP puede ocupar varios cientos de MB. ¿Seguir?')) { btn.disabled = false; return; }
      const zip = new MR.Zip(), filas = [];
      for (const { i, fig, e, m } of paresDataset(op, pool, cfgBase)) {
        const id = String(i + 1).padStart(6, '0');
        const cI = lienzoFigura(fig, m.izq, null, cfgBase, pool.radioMax, op.tam);
        const cD = lienzoFigura(fig, m.der, m.luzDer, cfgBase, pool.radioMax, op.tam);
        const fila = {
          id, particion: fig.particion, figura: fig.id, n_cubos: fig.nCubos, n_brazos: fig.nBrazos,
          etiqueta: e.tipo, y: e.tipo === 'espejo' ? 1 : 0, angulo: e.angulo, signo_giro: e.signo, eje: e.eje,
          visibilidad_min_der: +MR.visibilidad(fig, m.der).min.toFixed(3)
        };
        if (op.modo === 'par') { fila.archivo = `imagenes/${id}.png`; zip.agregar(fila.archivo, await aPng(lienzoPar(cI, cD))); }
        else {
          fila.archivo_izq = `imagenes/${id}_izq.png`; fila.archivo_der = `imagenes/${id}_der.png`;
          zip.agregar(fila.archivo_izq, await aPng(cI)); zip.agregar(fila.archivo_der, await aPng(cD));
        }
        filas.push(fila);
        if (i % 10 === 0) { progreso('d-prog', (i + 1) / op.n); await pausa(); }
      }
      const cols = ['id', 'particion', 'archivo', 'archivo_izq', 'archivo_der', 'figura', 'n_cubos', 'n_brazos', 'etiqueta', 'y', 'angulo', 'signo_giro', 'eje', 'visibilidad_min_der'];
      zip.agregar('etiquetas.csv', csv(cols.filter(c => filas.some(f => f[c] !== undefined)), filas));
      zip.agregar('figuras.json', JSON.stringify(pool.figs.map(f => ({ id: f.id, particion: f.particion, cubos: f.cubosEnteros })), null, 1));
      zip.agregar('config_dataset.json', JSON.stringify({ generado: new Date().toISOString(), opciones: op, estilo: cfgBase.estilo, giroProfundidadFijo: cfgBase.giroProfundidadFijo, espejo: cfgBase.espejo }, null, 1));
      zip.agregar('LEEME.txt', [
        'DATASET DE ENTRENAMIENTO · ROTACIÓN MENTAL (igual / espejo)',
        `${op.n} pares · ${pool.figs.length} figuras · eje ${op.eje} · ángulos ${op.amin}-${op.amax}° · semilla ${op.semilla}`,
        '',
        'etiquetas.csv: una fila por par. y = 1 si es espejo, 0 si es igual. particion = train / val (por figura:',
        'las figuras de validación nunca aparecen en entrenamiento).',
        'Las figuras del test humano (y sus espejos) están excluidas: evalúa el modelo final con el ZIP del test.'
      ].join('\n') + '\n');
      MR.descargar(`dataset_entrenamiento_${op.n}pares_${op.dim === '2d' ? '2d' : op.eje}.zip`, zip.generar());
    } catch (err) { alert('Error: ' + err.message); console.error(err); }
    progreso('d-prog', null); btn.disabled = false;
  });
  preparaDataset();
})();
