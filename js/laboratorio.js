/* =====================================================================
 *  LABORATORIO (index.html): panel del experimentador y sesión completa
 * ---------------------------------------------------------------------
 *  panel → datos del participante → bloque 1 → descanso → bloque 2 …
 *  → cuestionario final → resultados (se descarga el CSV de la sesión)
 * ===================================================================== */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (x) => x === null || x === undefined ? '—' : Math.round(x * 100) + ' %';
  const ms = (x) => x === null || x === undefined ? '—' : Math.round(x) + ' ms';
  const fecha = (iso) => { try { return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return iso; } };

  MR.Motor.montar();
  const params = new URLSearchParams(location.search);
  let enCurso = false;
  window.addEventListener('beforeunload', (ev) => { if (enCurso) { ev.preventDefault(); ev.returnValue = ''; } });

  /* =================== Panel: nueva sesión =================== */
  const sOrden = $('s-orden');
  $('s-codigo').value = params.get('participante') || MR.siguienteCodigoLab();
  // Al recargar, el navegador puede restaurar casillas de antes: se vuelve siempre a los valores por defecto
  // (sobre todo «Demostración», que marcaría como prueba los datos de un participante real)
  $('s-e1').checked = true; $('s-e2').checked = true; $('s-2d').checked = true;
  $('s-demo').checked = params.get('demo') === '1';

  const codigoValido = (c) => /^[A-Za-z0-9_-]{1,20}$/.test(c);
  const bloquesElegidos = () => MR.bloquesSesion({ normal: $('s-e1').checked, distraccion: $('s-e2').checked, control2D: $('s-2d').checked });
  // El desplegable de orden ofrece «automático» y todas las permutaciones de los tests marcados
  let firmaOrdenes = '';
  function rellenarOrdenes() {
    const bloques = bloquesElegidos(), firma = bloques.join(',');
    if (firma === firmaOrdenes) return;
    firmaOrdenes = firma;
    sOrden.innerHTML = '<option value="auto">Automático según el código</option>' +
      MR.ordenesPosibles(bloques).map((o, i) => `<option value="${i}">${esc(MR.nombreOrden(o))}</option>`).join('');
    sOrden.value = 'auto'; // al cambiar los tests cambian las permutaciones: se vuelve a «automático»
    sOrden.disabled = bloques.length < 2;
  }
  const planElegido = () => {
    const bloques = bloquesElegidos();
    if (!bloques.length) return [];
    return sOrden.value === 'auto' ? MR.ordenPorCodigo($('s-codigo').value, bloques) : MR.ordenesPosibles(bloques)[+sOrden.value];
  };
  const ajustesDemo = () => $('s-demo').checked ? { ensayosPorCelda: 1 } : null;
  const paresDe = (plan, ajustes) => plan.reduce((t, k) => {
    let c = MR.configDeCondicion(k);
    if (ajustes) c = MR.mezclarProfundo(c, ajustes);
    return t + c.angulos.length * 2 * c.ensayosPorCelda;
  }, 0);

  function actualizarPlan() {
    rellenarOrdenes();
    const codigo = $('s-codigo').value.trim();
    const bloques = bloquesElegidos();
    const n = MR.numeroDeCodigo(codigo), total = MR.ordenesPosibles(bloques).length;
    $('s-orden-nota').textContent = bloques.length < 2 ? 'Con un solo test no hay orden que variar.'
      : sOrden.value !== 'auto' ? 'Orden elegido a mano.'
        : !n ? `El código no lleva número: se usará ${MR.nombreOrden(MR.ordenesPosibles(bloques)[0])}.`
          : `${codigo} → ${MR.nombreOrden(MR.ordenPorCodigo(codigo, bloques))}` +
            (total === 2 ? ' (los impares empiezan por un test y los pares por el otro)' : ` (orden ${MR.indiceOrdenPorCodigo(codigo, bloques) + 1} de ${total}; van rotando)`);
    const usados = new Set(MR.Almacen.todas().filter(s => !s.prueba).map(s => s.participante.codigo));
    $('s-codigo-nota').textContent = usados.has(codigo) ? '⚠ Ya hay datos con este código en este navegador.' : '';
    const plan = planElegido();
    $('s-plan').innerHTML = plan.length
      ? plan.map((k, i) => `${i ? '<span class="flecha-plan">→</span>' : ''}<span class="chip">${i + 1}. ${esc(MR.nombreCorto(k))}</span>`).join('')
      : '<span class="chip gris">Elige al menos un test</span>';
    const aj = ajustesDemo();
    $('s-resumen').textContent = plan.length
      ? `${paresDe(plan, aj)} pares en total · unos ${Math.max(1, Math.round(MR.minutosEstimados(plan, aj)))} minutos, más los descansos.` +
        (aj ? ' Modo demostración: los datos se guardan marcados como prueba.' : '')
      : '';
    $('s-error').textContent = '';
  }
  $('form-sesion').addEventListener('input', actualizarPlan);
  $('form-sesion').addEventListener('change', actualizarPlan);
  actualizarPlan();

  $('form-sesion').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const codigo = $('s-codigo').value.trim();
    if (!codigoValido(codigo)) { $('s-error').textContent = 'Escribe un código de participante (letras, números, - o _), por ejemplo P07.'; $('s-codigo').focus(); return; }
    const plan = planElegido();
    if (!plan.length) { $('s-error').textContent = 'Elige al menos un test.'; return; }
    prepararDatos({ plan, codigo, orden: MR.textoOrden(plan), ajustes: ajustesDemo(), cfgPersonalizada: null });
  });

  /* =================== Panel: un solo bloque (avanzado) =================== */
  const sel = $('sel-condicion');
  for (const [k, c] of Object.entries(MR.CONDICIONES)) {
    const o = document.createElement('option'); o.value = k; o.textContent = c.nombre; sel.appendChild(o);
  }
  sel.value = MR.CONDICIONES[params.get('condicion')] ? params.get('condicion') : 'sin_limite';
  if (params.get('condicion') || params.get('ajustes') === '1') $('ajustes').open = true;

  const textoConfig = (c) => { const x = Object.assign({}, c); delete x.condicion; return JSON.stringify(x, null, 2); };
  function actualizarCondicion() {
    const c = MR.configDeCondicion(sel.value);
    $('json-config').value = textoConfig(c);
    $('error-json').textContent = '';
    const n = c.angulos.length * 2 * c.ensayosPorCelda;
    $('resumen-condicion').textContent =
      `${n} pares · ángulos ${c.angulos.join('°, ')}° · giro ${c.ejeRotacion}` +
      ` · límite ${c.limiteRespuestaMs ? c.limiteRespuestaMs / 1000 + ' s' : 'ninguno'}` +
      (c.presentacion === 'secuencial'
        ? ` · secuencial: izquierda ${c.secuencial.primeraMs / 1000} s → derecha ${c.secuencial.segundaMs ? c.secuencial.segundaMs / 1000 + ' s' : 'hasta responder'}`
        : ` · exposición ${c.tiempoExposicionMs ? c.tiempoExposicionMs / 1000 + ' s' : 'hasta responder'}`) +
      (c.distraccion && c.distraccion.activa
        ? ` · distracción (${[c.distraccion.sonido && 'pitidos', c.distraccion.imagen && 'formas'].filter(Boolean).join(' + ')}) en el ${Math.round(c.distraccion.probabilidad * 100)} % de los pares`
        : '');
  }
  sel.addEventListener('change', actualizarCondicion);
  actualizarCondicion();

  function leerConfig() {
    const base = MR.configDeCondicion(sel.value);
    let c;
    try { c = JSON.parse($('json-config').value); }
    catch (e) { $('ajustes').open = true; $('error-json').textContent = 'JSON no válido: ' + e.message; return null; }
    const modificada = textoConfig(base) !== JSON.stringify(c, null, 2);
    c = MR.mezclarProfundo(MR.CONFIG_BASE, c);
    c.condicion = sel.value + (modificada ? '_personalizada' : '');
    return { cfg: c, modificada };
  }

  $('btn-bloque').addEventListener('click', () => {
    const codigo = $('s-codigo').value.trim();
    if (!codigoValido(codigo)) { $('s-error').textContent = 'Escribe primero el código del participante.'; $('s-codigo').focus(); return; }
    const r = leerConfig();
    if (!r) return;
    try { MR.generarConjunto(r.cfg); } catch (e) { $('error-json').textContent = e.message; return; }
    prepararDatos({ plan: [sel.value], codigo, orden: MR.claveBase(sel.value), ajustes: ajustesDemo(), cfgPersonalizada: r.modificada ? r.cfg : null });
  });

  /* =================== Datos guardados =================== */
  let grupos = [];
  function pintarAlmacen() {
    grupos = MR.agruparSesiones(MR.Almacen.todas());
    const mb = MR.Almacen.megas();
    const personas = new Set(grupos.map(g => g.sujeto)).size;
    $('info-almacen').textContent = grupos.length
      ? `${grupos.length} sesión(es) de ${personas} participante(s) · ${mb.toFixed(2)} MB ocupados (el navegador admite unos 5 MB).`
      : 'Todavía no hay sesiones guardadas en este navegador.';
    $('aviso-almacen').hidden = mb < 3.5;
    $('aviso-almacen').textContent = 'El almacenamiento del navegador se está llenando: descarga todo (CSV y JSON), guárdalo y después borra los datos guardados.';
    $('tabla-sesiones').innerHTML = grupos.length ? '<tr><th>Participante</th><th>Fecha</th><th>Partes</th><th></th></tr>' + grupos.map((g, i) => {
      const chips = g.sesiones.map(s => {
        const nTest = s.ensayos.filter(e => e.bloque === 'test').length;
        const clase = s.estado === 'completa' ? '' : s.estado === 'omitido' ? 'omitido' : 'parcial';
        const extra = s.estado === 'incompleta' ? ` · ${nTest} pares` : '';
        return `<span class="chip ${clase}" title="${esc(s.condicion)} · ${esc(s.estado)}">${esc(MR.nombreCorto(s.condicion))}${extra}</span>`;
      }).join(' ');
      return `<tr>
        <td><b>${esc(g.sujeto)}</b> ${g.modalidad === 'online' ? '<span class="chip online">online</span>' : ''} ${g.prueba ? '<span class="chip prueba">prueba</span>' : ''}
          ${g.orden ? `<div class="nota">${esc(MR.nombreOrden(g.orden))}</div>` : ''}</td>
        <td>${fecha(g.inicio)}</td>
        <td>${chips}</td>
        <td style="white-space:nowrap"><button type="button" class="btn sec" data-csv="${i}">CSV</button>
          <button type="button" class="btn sec peligro" data-borrar="${i}" title="Borrar esta sesión">✕</button></td>
      </tr>`;
    }).join('') : '';
  }
  $('tabla-sesiones').addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.csv !== undefined) {
      const g = grupos[+b.dataset.csv];
      MR.descargar(MR.nombreArchivoGrupo(g.sesiones, 'csv'), MR.csvDeSesiones(g.sesiones), 'text/csv;charset=utf-8');
    } else if (b.dataset.borrar !== undefined) {
      const g = grupos[+b.dataset.borrar];
      if (confirm(`¿Borrar la sesión de ${g.sujeto} (${g.sesiones.length} bloque/s) de este navegador? No se puede deshacer. Descárgala antes si la necesitas.`)) {
        MR.Almacen.borrarIds(g.sesiones.map(s => s.id));
        pintarAlmacen(); actualizarPlan();
      }
    }
  });
  const hoy = () => new Date().toISOString().slice(0, 10);
  $('btn-descargar-todo').addEventListener('click', () => {
    const todas = MR.Almacen.todas();
    if (!todas.length) { alert('No hay sesiones guardadas.'); return; }
    MR.descargar('MR_todas_las_sesiones_' + hoy() + '.csv', MR.csvDeSesiones(todas), 'text/csv;charset=utf-8');
  });
  $('btn-descargar-json').addEventListener('click', () => {
    const todas = MR.Almacen.todas();
    if (!todas.length) { alert('No hay sesiones guardadas.'); return; }
    MR.descargar('MR_todas_las_sesiones_' + hoy() + '.json', JSON.stringify(todas, null, 1), 'application/json');
  });
  $('btn-borrar-todo').addEventListener('click', () => {
    const n = MR.Almacen.todas().length;
    if (!n) return;
    if (confirm(`Se borrarán ${n} bloques guardados en este navegador. No se puede deshacer: descárgalos antes si los necesitas. ¿Borrar?`)) {
      MR.Almacen.borrar(); pintarAlmacen(); actualizarPlan();
    }
  });
  pintarAlmacen();

  function volverAlPanel() {
    pintarAlmacen();
    $('s-codigo').value = MR.siguienteCodigoLab();
    actualizarPlan();
    MR.Motor.mostrar('p-panel');
  }

  /* =================== Datos del participante =================== */
  let pendiente = null;
  function prepararDatos(op) {
    pendiente = op;
    $('form-participante').reset();
    $('d-etiqueta').textContent = `Participante ${op.codigo}` + (op.ajustes ? ' · demostración' : '');
    MR.Motor.mostrar('p-datos');
  }
  $('btn-volver-panel').addEventListener('click', () => { pendiente = null; volverAlPanel(); });

  $('form-participante').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const op = pendiente;
    if (!op) return;
    pendiente = null;
    const participante = {
      codigo: op.codigo, edad: $('f-edad').value, genero: $('f-genero').value, mano: $('f-mano').value,
      estudios: $('f-estudios').value, vision: $('f-vision').value, experiencia_3d: $('f-exp3d').value, test_previo: $('f-previo').value
    };
    const ctx = {
      modalidad: 'laboratorio', participante, entorno: MR.Motor.entorno(),
      grupo: MR.idSesionCompleta(op.codigo), ordenBloques: op.orden, origen: '',
      prueba: op.ajustes ? 1 : 0, ajustes: op.ajustes, sufijo: op.ajustes ? '_demo' : '',
      cfgPersonalizada: op.cfgPersonalizada
    };
    correrSesion(op.plan, ctx);
  });

  /* =================== Sesión =================== */
  async function correrSesion(plan, ctx) {
    enCurso = true;
    const sesiones = [];
    let primera = true, descansoPrevioMs = null;
    for (let i = 0; i < plan.length; i++) {
      const s = await MR.Motor.correrBloque(ctx, plan[i], {
        posicion: i + 1, total: plan.length, primera, descansoPrevioMs,
        alGuardar: (x) => MR.Almacen.guardar(x), sinSonido: 'continuar'
      });
      sesiones.push(s);
      if (s.estado === 'completa') primera = false;
      if (i < plan.length - 1) {
        descansoPrevioMs = await MR.Motor.descanso({
          etiqueta: `Parte ${i + 1} de ${plan.length} terminada`, titulo: 'Descanso',
          html: '<p>Descansa un momento antes de la siguiente parte.</p>', minimoS: MR.SESION.descansoMinimoS || 0
        });
      }
    }
    MR.Motor.salirPantallaCompleta();
    MR.Motor.mantenerEncendida(false);
    const cf = MR.CONFIG_BASE.cuestionarioFinal ? await MR.Motor.cuestionarioFinal(MR.PREGUNTAS_FINALES) : {};
    sesiones.forEach(s => { s.cuestionarioFinal = cf; MR.Almacen.guardar(s); });
    enCurso = false;
    mostrarResultados(sesiones);
  }

  /* =================== Resultados =================== */
  let actuales = [];
  function mostrarResultados(sesiones) {
    actuales = sesiones;
    const completas = sesiones.filter(s => s.estado === 'completa');
    const principal = completas.find(s => MR.claveBase(s.condicion) === 'sin_limite') || completas[0];
    MR.Motor.mostrar('p-resultados');
    $('res-etiqueta').textContent = `Sesión terminada · ${sesiones[0].participante.codigo}` + (sesiones[0].prueba ? ' · prueba' : '');

    if (principal) {
      const R = MR.resumir(principal.ensayos, principal.config);
      $('res-cifras').innerHTML = [
        [R.aciertos + ' / ' + R.pares, 'pares distinguidos'],
        [pct(R.precision), 'precisión (sobre respondidos)'],
        [R.puntuacion, 'puntuación (aciertos − errores)'],
        [ms(R.trMedianaAciertos), 'TR mediano de aciertos']
      ].map(([v, t]) => `<div class="cifra"><div class="v">${v}</div><div class="t">${t}</div></div>`).join('');
      $('res-titulo-grafica').textContent = `Tiempo de respuesta según el ángulo · ${MR.nombreCorto(principal.condicion)}`;
      $('res-pendiente').textContent = R.pendiente !== null
        ? `Coste de rotación: cada grado más de giro costó unos ${R.pendiente.toFixed(1)} ms (intercepto ${Math.round(R.intercepto)} ms, R² = ${R.r2.toFixed(2)}).`
        : 'No hay aciertos suficientes en pares iguales para calcular el coste de rotación (hacen falta ≥ 2 aciertos en ≥ 3 ángulos).';
      $('res-tabla').innerHTML = '<tr><th>Ángulo</th><th>Tipo</th><th>Pares</th><th>Respondidos</th><th>Aciertos</th><th>Precisión</th><th>TR mediano</th></tr>' +
        R.celdas.map(c => `<tr><td>${c.angulo}°</td><td>${c.tipo}</td><td>${c.n}</td><td>${c.respondidos}</td><td>${c.aciertos}</td><td>${pct(c.precision)}</td><td>${ms(c.trMediana)}</td></tr>`).join('');
      requestAnimationFrame(() => MR.dibujarGrafica($('grafica'), R, principal.config));
    }
    // Cada test se compara con el test normal de la misma persona
    const base = completas.find(s => MR.claveBase(s.condicion) === 'sin_limite');
    const rBase = base ? MR.resumenBloque(base) : null;
    const signo = (x, f) => (x >= 0 ? '+' : '−') + f(Math.abs(x));
    $('res-bloques').innerHTML = '<tr><th>Posición</th><th>Test</th><th>Pares</th><th>Precisión</th><th>TR mediano</th><th>Frente al test normal</th></tr>' +
      sesiones.map(s => {
        const nombre = esc(MR.nombreCorto(s.condicion)) + (s.practica_repetida ? ' <span class="chip gris">práctica repetida</span>' : '') +
          (s.sonido_comprobado === 'no' ? ' <span class="chip parcial">sin sonido</span>' : '');
        if (s.estado !== 'completa') return `<tr><td>${s.posicion_bloque}</td><td>${nombre}</td><td colspan="4">${s.estado === 'omitido' ? 'Omitido (sin sonido)' : 'Incompleto'}</td></tr>`;
        const r = MR.resumenBloque(s);
        let frente = '—';
        if (rBase && s !== base && r.precision !== null && rBase.precision !== null) {
          frente = signo((r.precision - rBase.precision) * 100, x => Math.round(x) + ' pp');
          if (r.trMedianaAciertos !== null && rBase.trMedianaAciertos !== null) frente += ' · ' + signo(r.trMedianaAciertos - rBase.trMedianaAciertos, x => Math.round(x) + ' ms');
        }
        // si el bloque tiene pares con y sin distracción (probabilidad < 1), también se comparan dentro del bloque
        if (r.con && r.con.n && r.sin && r.sin.n) frente += `<div class="nota">con distracción ${pct(r.con.precision)} · ${ms(r.con.tr)}; sin ${pct(r.sin.precision)} · ${ms(r.sin.tr)}</div>`;
        return `<tr><td>${s.posicion_bloque}</td><td>${nombre}</td><td>${r.pares}</td><td>${pct(r.precision)}</td><td>${ms(r.trMedianaAciertos)}</td><td>${frente}</td></tr>`;
      }).join('');
    $('res-detalle').style.display = (MR.CONFIG_BASE.mostrarResultadosAlParticipante && principal) ? '' : 'none';

    if (MR.LAB.descargaAutomatica) descargarCsv();
    $('res-guardado').textContent = (MR.LAB.descargaAutomatica ? 'El CSV de la sesión se ha descargado. ' : '') +
      'Además hay una copia en este navegador (panel → Datos guardados).';
  }
  function descargarCsv() {
    MR.descargar(MR.nombreArchivoGrupo(actuales, 'csv'), MR.csvDeSesiones(actuales), 'text/csv;charset=utf-8');
  }
  $('btn-csv').addEventListener('click', descargarCsv);
  $('btn-json').addEventListener('click', () => MR.descargar(MR.nombreArchivoGrupo(actuales, 'json'), JSON.stringify(actuales, null, 1), 'application/json'));
  $('btn-panel').addEventListener('click', volverAlPanel);
})();
