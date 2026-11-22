/* =====================================================================
 *  VERSIÓN ONLINE (participar.html) para compartir por WhatsApp
 * ---------------------------------------------------------------------
 *  bienvenida → datos generales →
 *  test normal, test con distracción y control 2D, EN UN ORDEN AL AZAR
 *  (uno de los 6 posibles; se guarda en orden_bloques) → cuestionario
 *  final → resultados y envío.
 *
 *  Parámetros de la URL:
 *    ?estudio=1      solo el test normal (versión corta, ~5 min)
 *    ?prueba=1       marca los datos como prueba (para ensayar sin ensuciar los datos)
 *    ?corta=1        demostración: 8 pares por bloque (implica prueba=1)
 *    ?origen=grupo3  anota de qué grupo o enlace viene la persona (letras, números, - y _)
 * ===================================================================== */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (x) => x === null || x === undefined ? '—' : Math.round(x * 100) + ' %';
  const seg = (ms) => ms === null || ms === undefined ? '—' : (ms / 1000).toFixed(1).replace('.', ',') + ' s';
  const O = MR.ONLINE;

  MR.Motor.montar();
  const params = new URLSearchParams(location.search);
  const corta = params.get('corta') === '1';
  const prueba = corta || params.get('prueba') === '1';
  const soloE1 = params.get('estudio') === '1' || !O.estudio2;
  const origen = (params.get('origen') || '').replace(/[^\w-]/g, '').slice(0, 40);
  const ajustes = corta ? { ensayosPorCelda: 1 } : null;
  let enCurso = false;
  window.addEventListener('beforeunload', (ev) => { if (enCurso) { ev.preventDefault(); ev.returnValue = ''; } });
  $('cinta-prueba').hidden = !prueba;
  $('cinta-prueba').textContent = corta ? 'DEMO · 8 PARES POR BLOQUE' : 'MODO PRUEBA';

  // Lo que quedara pendiente de enviar de otra vez
  MR.Envio.reintentarPendientes();

  /* ---------- plan de la sesión: los tests en un orden al azar (contrabalanceo) ---------- */
  const plan = MR.ordenAleatorio(MR.bloquesSesion({ normal: true, distraccion: !soloE1, control2D: !!O.control2D && !soloE1 }));
  const orden = MR.textoOrden(plan);
  const minutos = Math.max(1, Math.round(corta ? MR.minutosEstimados(plan, ajustes) : (soloE1 ? O.minutosCorta : O.minutos)));
  const hay = (que) => plan.some(k => que === 'sonido' ? MR.usaSonido(k) : MR.usaImagen(k));
  const codigo = MR.codigoAleatorio('W', 5);
  const grupo = MR.idSesionCompleta(codigo);

  /* ---------- estado de participación en este dispositivo ---------- */
  const CLAVE_ESTADO = 'MR_online_participacion_v1';
  const leerEstado = () => { try { return JSON.parse(localStorage.getItem(CLAVE_ESTADO) || 'null'); } catch (e) { return null; } };
  const guardarEstado = (estado) => { try { localStorage.setItem(CLAVE_ESTADO, JSON.stringify({ codigo, estado, fecha: new Date().toISOString() })); } catch (e) {} };

  /* ---------- bienvenida ---------- */
  $('b-minutos').textContent = `${minutos} minuto${minutos === 1 ? '' : 's'}`;
  $('req-sonido').hidden = !hay('sonido');
  try {
    const cfg = MR.configDeCondicion('sin_limite');
    const conj = MR.generarConjunto(cfg);
    const fig = conj.figuras.find(f => f.practica) || conj.figuras[0];
    const tam = window.innerWidth < 420 ? 110 : 140;
    MR.dibujarPar($('portada-1'), $('portada-2'), conj, { figura: fig.id, tipo: 'igual', angulo: 100, signo: 1, eje: 'plano' }, cfg, tam);
  } catch (e) { /* la portada es decorativa */ }

  const previo = leerEstado();
  if (previo && !prueba) {
    $('b-aviso').hidden = false;
    $('b-aviso').innerHTML = previo.estado === 'completado'
      ? `Ya has hecho el test en este dispositivo (código <span class="codigo">${esc(previo.codigo)}</span>). ¡Gracias! Si <b>otra persona</b> quiere hacerlo en este mismo dispositivo, puede pulsar «Empezar».`
      : 'Parece que empezaste el test y no lo terminaste. Puedes volver a empezar desde el principio.';
  }
  $('btn-bienvenida').onclick = () => MR.Motor.mostrar('p-datos');

  /* ---------- datos generales ---------- */
  const edad = $('f-edad');
  $('form-datos').onsubmit = (ev) => { ev.preventDefault(); empezar(); };

  /* ---------- sesión ---------- */
  async function empezar() {
    const participante = {
      codigo, edad: edad.value, genero: $('f-genero').value, mano: $('f-mano').value, estudios: $('f-estudios').value,
      vision: $('f-vision').value, experiencia_3d: $('f-exp3d').value, test_previo: $('f-previo').value
    };
    const ctx = {
      modalidad: 'online', participante, entorno: MR.Motor.entorno(), grupo, ordenBloques: orden, origen,
      prueba: prueba ? 1 : 0, ajustes, sufijo: corta ? '_demo' : '', cfgPersonalizada: null
    };
    if (!prueba) guardarEstado('empezado');
    enCurso = true;
    const sesiones = [];
    let primera = true;
    for (let i = 0; i < plan.length; i++) {
      const s = await MR.Motor.correrBloque(ctx, plan[i], {
        posicion: i + 1, total: plan.length, primera, sinSonido: O.sinSonido,
        alGuardar: (x) => MR.Almacen.guardar(x)
      });
      sesiones.push(s);
      if (s.estado === 'completa') {
        primera = false;
        MR.Envio.enviar(MR.Envio.paqueteBloque(s)); // en segundo plano
        if (i < plan.length - 1) {
          await MR.Motor.mensaje({
            etiqueta: `Parte ${i + 1} de ${plan.length} terminada`, titulo: '¡Vas muy bien!',
            html: `<p>Descansa un momento. Te ${plan.length - i - 1 === 1 ? 'queda 1 parte' : `quedan ${plan.length - i - 1} partes`}.</p>`,
            boton: 'Siguiente parte'
          });
        }
      }
    }
    MR.Motor.salirPantallaCompleta();
    MR.Motor.mantenerEncendida(false);
    const cf = await MR.Motor.cuestionarioFinal(MR.PREGUNTAS_FINALES.concat([MR.PREGUNTA_INTERRUPCIONES]));
    sesiones.forEach(s => { s.cuestionarioFinal = cf; MR.Almacen.guardar(s); });
    enCurso = false;
    if (!prueba) guardarEstado('completado');
    mostrarFinal(sesiones);

    if (!MR.Envio.configurado()) { estadoEnvio('manual', sesiones); return; }
    estadoEnvio('enviando', sesiones);
    await MR.Envio.enviar(MR.Envio.paqueteSesion(filaSesion(sesiones, cf)));
    const ok = await MR.Envio.asegurar(grupo, (n) => estadoEnvio('enviando', sesiones, n));
    estadoEnvio(ok ? 'ok' : 'error', sesiones);
  }

  // Una fila por persona para la hoja «sesiones» (datos generales, cuestionario y resumen)
  function filaSesion(sesiones, cf) {
    const s0 = sesiones[0], p = s0.participante, ent = s0.entorno || {};
    const e1 = sesiones.find(s => MR.claveBase(s.condicion) === 'sin_limite' && s.estado === 'completa');
    const r1 = e1 ? MR.resumir(e1.ensayos, e1.config) : null;
    const e2d = sesiones.find(s => MR.claveBase(s.condicion) === 'control_2d' && s.estado === 'completa');
    const r2d = e2d ? MR.resumir(e2d.ensayos, e2d.config) : null;
    const redondea = (x, d) => (x === null || x === undefined) ? '' : +x.toFixed(d);
    return Object.assign({
      sujeto: p.codigo, sesion_completa: s0.grupo, modalidad: 'online', origen, prueba: prueba ? 1 : 0,
      inicio: s0.inicio, fin: new Date().toISOString(),
      duracion_min: +((Date.now() - Date.parse(s0.inicio)) / 60000).toFixed(1),
      estado: sesiones.every(s => s.estado !== 'incompleta') ? 'completa' : 'incompleta',
      orden_bloques: orden, bloques: sesiones.map(s => `${MR.claveBase(s.condicion)}:${s.estado}`).join(' '),
      edad: p.edad, genero: p.genero, mano: p.mano, estudios: p.estudios, vision: p.vision,
      experiencia_3d: p.experiencia_3d, test_previo: p.test_previo
    }, cf, {
      dispositivo: ent.dispositivo, pantalla: ent.pantalla, ventana: ent.ventana, idioma: ent.idioma, navegador: ent.navegador,
      sonido_comprobado: (sesiones.find(s => s.sonido_comprobado) || {}).sonido_comprobado || '',
      practica_repetida: sesiones.some(s => s.practica_repetida) ? 1 : 0,
      cambios_pestana: sesiones.reduce((t, s) => t + s.ensayos.reduce((u, e) => u + (e.cambios_pestana || 0), 0), 0),
      precision_estudio1: r1 ? redondea(r1.precision, 4) : '',
      tr_mediana_estudio1: r1 ? redondea(r1.trMedianaAciertos, 1) : '',
      pendiente_estudio1: r1 ? redondea(r1.pendiente, 3) : '',
      precision_2d: r2d ? redondea(r2d.precision, 4) : '',
      tr_mediana_2d: r2d ? redondea(r2d.trMedianaAciertos, 1) : '',
      pendiente_2d: r2d ? redondea(r2d.pendiente, 3) : '',
      version_test: 3   // 3 = sesión con los tres tests (normal, distracción y 2D) en orden contrabalanceado
    });
  }

  /* ---------- pantalla final ---------- */
  function mostrarFinal(sesiones) {
    MR.Motor.mostrar('p-gracias');
    $('g-codigo').textContent = codigo;
    $('g-contacto').innerHTML = O.contacto
      ? `Si en algún momento quieres que borremos tus datos, escribe a <a href="mailto:${esc(O.contacto)}">${esc(O.contacto)}</a> indicando ese código.` : '';

    const e1 = sesiones.find(s => MR.claveBase(s.condicion) === 'sin_limite' && s.estado === 'completa');
    $('g-resultados').hidden = !e1;
    if (e1) {
      const R = MR.resumir(e1.ensayos, e1.config);
      const coste = R.pendiente !== null ? Math.round(R.pendiente * 50) : null;
      $('g-cifras').innerHTML = [
        [`${R.aciertos} / ${R.pares}`, 'aciertos con los cubos, sin distracción'],
        [pct(R.precision), 'precisión'],
        [seg(R.trMedianaAciertos), 'tiempo típico por pareja (aciertos)'],
        [coste !== null ? (coste >= 0 ? '+' : '') + coste + ' ms' : '—', 'por cada 50° más de giro']
      ].map(([v, t]) => `<div class="cifra"><div class="v">${v}</div><div class="t">${t}</div></div>`).join('');
      requestAnimationFrame(() => MR.dibujarGrafica($('g-grafica'), R, e1.config));
      $('g-explicacion').innerHTML = (coste !== null && coste > 0
        ? `Cuanto más girada estaba la figura, más tardabas en responder: unos <b>${coste} ms más por cada 50° de giro</b>. ` +
          'Es lo que descubrieron Shepard y Metzler en 1971: parece que «giramos» la figura en la cabeza, y girarla más lleva más tiempo. '
        : 'En las personas, normalmente, cuanto más girada está la figura, más se tarda en responder: parece que la «giramos» en la cabeza. ') +
        'Una red neuronal que hemos entrenado solo para esta tarea acierta casi siempre y tarda lo mismo con cualquier giro: resuelve el problema de otra manera.';
      // Comparación con las figuras planas, si hizo el control 2D
      const e2d = sesiones.find(s => MR.claveBase(s.condicion) === 'control_2d' && s.estado === 'completa');
      const R2 = e2d ? MR.resumir(e2d.ensayos, e2d.config) : null;
      if (R2 && R2.precision !== null) {
        $('g-explicacion').innerHTML += ` Con las <b>figuras planas</b> acertaste el ${pct(R2.precision)} y tardaste unos ${seg(R2.trMedianaAciertos)} por pareja` +
          (R.trMedianaAciertos && R2.trMedianaAciertos ? (R2.trMedianaAciertos < R.trMedianaAciertos ? ': girar en 2D suele ser más fácil que en 3D.' : '.') : '.');
      }
    }

    const enlace = O.enlacePublico || (/^https?:$/.test(location.protocol) ? location.origin + location.pathname : '');
    $('g-compartir').hidden = !enlace;
    if (enlace) $('btn-compartir').href = 'https://wa.me/?text=' + encodeURIComponent(O.textoInvitacion.replace('{enlace}', enlace));
  }

  /* ---------- estado del envío y respaldo manual ---------- */
  function estadoEnvio(estado, sesiones, intento) {
    const caja = $('envio-estado');
    caja.className = 'estado-envio' + (estado === 'ok' ? ' ok' : estado === 'error' || estado === 'manual' ? ' error' : '');
    if (estado === 'enviando') {
      caja.innerHTML = `<p><span class="girando"></span>Enviando tus respuestas${intento > 1 ? ` (intento ${intento})` : ''}… No cierres esta página todavía.</p>`;
    } else if (estado === 'ok') {
      caja.innerHTML = '<p>✓ <b>Tus respuestas han llegado.</b> Ya puedes cerrar esta página cuando quieras.</p>';
    } else {
      caja.innerHTML = (estado === 'manual'
        ? '<p><b>Último paso: envíanos tus respuestas.</b> Pulsa el botón y mándale el archivo a la persona que te pasó el enlace.</p>'
        : '<p><b>No hemos podido confirmar que tus respuestas hayan llegado</b> (quizá falla la conexión). Lo volveremos a intentar la próxima vez que abras esta página. Si puedes, mándanos también el archivo a quien te pasó el enlace:</p>') +
        '<div class="fila-botones" id="respaldo"></div>' +
        (prueba && estado === 'manual' ? '<p class="nota">Modo prueba: el envío automático a la hoja de cálculo todavía no está configurado (MR.ONLINE.urlEnvio).</p>' : '');
      botonesRespaldo($('respaldo'), sesiones);
    }
  }

  function botonesRespaldo(cont, sesiones) {
    const csv = MR.csvDeSesiones(sesiones);
    const nombre = MR.nombreArchivoGrupo(sesiones, 'csv');
    let archivo = null;
    try { archivo = new File([csv], nombre, { type: 'text/csv' }); } catch (e) { /* navegador antiguo */ }
    const compartir = !!(archivo && navigator.canShare && navigator.canShare({ files: [archivo] }));
    cont.innerHTML = (compartir ? '<button type="button" class="btn whatsapp" id="btn-enviar-archivo">Enviar el archivo por WhatsApp…</button>' : '') +
      '<button type="button" class="btn" id="btn-descargar-archivo">Descargar el archivo</button>';
    if (compartir) {
      $('btn-enviar-archivo').onclick = () => {
        navigator.share({ files: [archivo], title: 'Test de rotación mental', text: `Resultados del test de rotación mental (código ${codigo})` }).catch(() => {});
      };
    }
    $('btn-descargar-archivo').onclick = () => MR.descargar(nombre, csv, 'text/csv;charset=utf-8');
  }
})();
