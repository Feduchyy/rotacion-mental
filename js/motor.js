/* =====================================================================
 *  MOTOR DEL TEST (común al laboratorio y a la versión online)
 * ---------------------------------------------------------------------
 *  Un bloque = una condición: (comprobación de sonido) → instrucciones →
 *  práctica (se repite una vez si falla) → pares del test.
 *  Las figuras, los pares y su orden salen de figuras.js y ensayos.js:
 *  son los mismos para todos los participantes y para la IA.
 *
 *  Cada bloque devuelve una "sesión" (una condición), con el mismo
 *  formato que antes, más los datos de la sesión completa a la que
 *  pertenece (grupo, posición, orden del Estudio 2, modalidad…).
 * ===================================================================== */
window.MR = window.MR || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  // Momento en que se pinta el siguiente fotograma. Si la ventana no está pintando
  // (minimizada, en segundo plano), a los 100 ms usa el reloj para no bloquear el test.
  const siguienteFrame = () => new Promise(r => {
    let hecho = false;
    requestAnimationFrame(t => { if (!hecho) { hecho = true; r(t); } });
    setTimeout(() => { if (!hecho) { hecho = true; r(performance.now()); } }, 100);
  });

  // Qué pares llevan distracción. Con probabilidad 1, todos. Si es menor, se reparte por igual
  // dentro de cada celda ángulo × tipo, con una semilla fija (igual para todos los participantes).
  function asignarDistraccion(lista, cfg) {
    const D = cfg.distraccion;
    if (!D || !D.activa) { lista.forEach(e => { e.conDistraccion = false; }); return; }
    const p = Math.max(0, Math.min(1, D.probabilidad == null ? 1 : D.probabilidad));
    if (p >= 1) { lista.forEach(e => { e.conDistraccion = true; }); return; }
    const rng = MR.crearRng(cfg.semilla + 31);
    const celdas = new Map();
    for (const e of lista) {
      const k = e.angulo + '|' + e.tipo;
      if (!celdas.has(k)) celdas.set(k, []);
      celdas.get(k).push(e);
    }
    for (const g of celdas.values()) {
      const marcados = new Set(MR.barajar(g.map((_, i) => i), rng).slice(0, Math.round(p * g.length)));
      g.forEach((e, i) => { e.conDistraccion = marcados.has(i); });
    }
  }

  /* ---------------- pantallas comunes ---------------- */
  const PANTALLAS = `
<section id="p-sonido" class="pantalla">
  <div class="tarjeta centrada">
    <p class="etiqueta" id="snd-parte"></p>
    <div class="icono-grande" aria-hidden="true">🔊</div>
    <h1>Comprobación de sonido</h1>
    <p>En la siguiente parte sonarán <b>pitidos</b> de vez en cuando. Sube el volumen o ponte auriculares<span class="solo-tactil"> y quita el modo silencio del móvil</span>.</p>
    <div class="fila-botones centro"><button type="button" class="btn" id="snd-probar">▶ Reproducir pitidos</button></div>
    <div id="snd-pregunta" hidden>
      <p><b>¿Has oído los pitidos?</b></p>
      <div class="fila-botones centro">
        <button type="button" class="btn principal" id="snd-si">Sí, se oyen bien</button>
        <button type="button" class="btn" id="snd-no">No los oigo</button>
      </div>
    </div>
    <p class="nota" id="snd-ayuda"></p>
    <div class="fila-botones centro"><button type="button" class="btn sec" id="snd-saltar" hidden></button></div>
  </div>
</section>

<section id="p-instrucciones" class="pantalla">
  <div class="tarjeta">
    <p class="etiqueta" id="ins-parte"></p>
    <h1 id="ins-titulo">Instrucciones</h1>
    <p id="ins-intro"></p>
    <div class="ejemplos">
      <figure>
        <div class="par-mini"><canvas id="ej-igual-1"></canvas><canvas id="ej-igual-2"></canvas></div>
        <figcaption><b>IGUAL</b> · la misma figura, girada</figcaption>
      </figure>
      <figure>
        <div class="par-mini"><canvas id="ej-espejo-1"></canvas><canvas id="ej-espejo-2"></canvas></div>
        <figcaption><b>ESPEJO</b> · su imagen en espejo: ningún giro las hace coincidir (como tu mano izquierda y la derecha)</figcaption>
      </figure>
    </div>
    <div class="teclas" id="ins-teclas">
      <div><kbd>←</kbd> o <kbd>F</kbd> &nbsp;=&nbsp; <b>Igual</b></div>
      <div><kbd>→</kbd> o <kbd>J</kbd> &nbsp;=&nbsp; <b>Espejo</b></div>
    </div>
    <p class="teclas-tactil" id="ins-tactil">Responde tocando los botones <b>Igual</b> (a la izquierda) y <b>Espejo</b> (a la derecha).</p>
    <ul id="lista-instrucciones" class="lista"></ul>
    <p class="aviso" id="ins-aviso" hidden></p>
    <div class="fila-botones">
      <button type="button" class="btn principal" id="btn-empezar">Empezar</button>
      <button type="button" class="btn" id="btn-ejemplo" hidden>Ver un ejemplo</button>
    </div>
  </div>
</section>

<section id="p-ensayo" class="pantalla">
  <div class="barra-progreso"><div id="progreso"></div></div>
  <div class="zona-ensayo" id="zona-ensayo">
    <div class="contador" id="contador"></div>
    <div class="fila-ensayo" id="fila-ensayo">
      <button type="button" class="btn resp resp-igual" data-resp="igual"><span class="flecha">←</span> Igual</button>
      <div class="contenedor-par">
        <div class="par" id="par">
          <canvas id="lienzo-izq" class="lienzo"></canvas>
          <canvas id="lienzo-der" class="lienzo"></canvas>
          <div class="fijacion" id="fijacion">+</div>
        </div>
      </div>
      <button type="button" class="btn resp resp-espejo" data-resp="espejo">Espejo <span class="flecha">→</span></button>
    </div>
    <div class="feedback" id="feedback"></div>
  </div>
</section>

<section id="p-mensaje" class="pantalla">
  <div class="tarjeta centrada">
    <p class="etiqueta" id="msg-etiqueta"></p>
    <h1 id="msg-titulo"></h1>
    <div id="msg-texto" class="msg-texto"></div>
    <div class="fila-botones centro">
      <button type="button" class="btn principal" id="msg-boton">Continuar</button>
      <button type="button" class="btn" id="msg-boton2" hidden></button>
    </div>
  </div>
</section>

<section id="p-final" class="pantalla">
  <div class="tarjeta">
    <h1>Unas últimas preguntas</h1>
    <form id="form-final">
      <div class="rejilla" id="final-preguntas"></div>
      <div class="fila-botones"><button class="btn principal" type="submit">Terminar</button></div>
    </form>
  </div>
</section>`;

  const Motor = MR.Motor = {
    tactil: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches),
    ultimaDimension: null,     // '3d' o '2d' del último bloque hecho en esta sesión (para avisar del cambio de figuras)
    montado: false,

    montar() {
      if (this.montado) return;
      document.body.insertAdjacentHTML('beforeend', PANTALLAS);
      document.body.classList.toggle('tactil', this.tactil);
      this.montado = true;
    },

    mostrar(id) {
      document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
      $(id).classList.add('activa');
      document.body.classList.toggle('ensayando', id === 'p-ensayo');
      window.scrollTo(0, 0);
    },

    /* Mensaje con uno o dos botones. Devuelve 1 o 2 según el botón pulsado.
       alPulsar se llama dentro del clic (sirve para pedir pantalla completa). */
    mensaje({ etiqueta = '', titulo = '', html = '', boton = 'Continuar', boton2 = null, alPulsar = null } = {}) {
      $('msg-etiqueta').textContent = etiqueta;
      $('msg-titulo').textContent = titulo;
      $('msg-texto').innerHTML = html;
      const b1 = $('msg-boton'), b2 = $('msg-boton2');
      b1.textContent = boton;
      b2.hidden = !boton2;
      if (boton2) b2.textContent = boton2;
      this.mostrar('p-mensaje');
      return new Promise(res => {
        let hecho = false;
        const tecla = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fin(1); } };
        const t = setTimeout(() => { if (!hecho) document.addEventListener('keydown', tecla); }, 400);
        const fin = (v) => {
          if (hecho) return;
          hecho = true; clearTimeout(t);
          b1.onclick = b2.onclick = null;
          document.removeEventListener('keydown', tecla);
          if (alPulsar) alPulsar(v);
          res(v);
        };
        b1.onclick = () => fin(1);
        b2.onclick = () => fin(2);
      });
    },

    /* ---------------- pantalla completa y pantalla encendida ---------------- */
    pedirPantallaCompleta() {
      const el = document.documentElement;
      const f = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!f || this.enPantallaCompleta()) return;
      try { const p = f.call(el); if (p && p.catch) p.catch(() => {}); } catch (e) { /* el navegador puede negarse */ }
    },
    salirPantallaCompleta() {
      const d = document;
      try {
        if (d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(() => {});
        else if (d.webkitFullscreenElement && d.webkitExitFullscreen) d.webkitExitFullscreen();
      } catch (e) {}
    },
    enPantallaCompleta() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },

    // Evita que el móvil apague la pantalla durante el test (si el navegador lo permite)
    mantenerEncendida(activar) {
      this._mantener = activar;
      if (!('wakeLock' in navigator)) return;
      if (activar && !this._bloqueo) {
        navigator.wakeLock.request('screen').then(b => {
          this._bloqueo = b;
          b.addEventListener('release', () => { this._bloqueo = null; });
        }).catch(() => {});
      }
      if (!activar && this._bloqueo) { this._bloqueo.release().catch(() => {}); this._bloqueo = null; }
      if (!this._escuchaVisible) {
        this._escuchaVisible = true;
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && this._mantener) this.mantenerEncendida(true);
        });
      }
    },

    /* ---------------- comprobación de sonido ---------------- */
    comprobarSonido({ parte = '', volumen = 0.35, textoSaltar = 'Seguir sin sonido' } = {}) {
      $('snd-parte').textContent = parte;
      const probar = $('snd-probar'), pregunta = $('snd-pregunta'), ayuda = $('snd-ayuda'), saltar = $('snd-saltar');
      pregunta.hidden = true; ayuda.textContent = ''; saltar.hidden = true;
      saltar.textContent = textoSaltar; probar.textContent = '▶ Reproducir pitidos';
      this.mostrar('p-sonido');
      let fallos = 0;
      return new Promise(res => {
        const fin = (v) => { probar.onclick = $('snd-si').onclick = $('snd-no').onclick = saltar.onclick = null; res(v); };
        probar.onclick = () => {
          MR.Distractores.activarAudio().then(() => {
            MR.Distractores.sonoro('pitidos', volumen, Math.random);
            pregunta.hidden = false;
            probar.textContent = '▶ Volver a reproducir';
          });
        };
        $('snd-si').onclick = () => fin('si');
        $('snd-no').onclick = () => {
          fallos++;
          ayuda.textContent = Motor.tactil
            ? 'Sube el volumen con los botones del lateral del móvil, quita el modo silencio y vuelve a probar. Si usas auriculares bluetooth, comprueba que están conectados.'
            : 'Sube el volumen del ordenador (y de los altavoces o auriculares) y vuelve a probar. Comprueba también que la pestaña del navegador no está silenciada.';
          if (fallos >= 2) saltar.hidden = false;
        };
        saltar.onclick = () => fin('no');
      });
    },

    /* ---------------- instrucciones de un bloque ---------------- */
    // info: { parte, primera, practica (nº de pares de práctica que se harán), alEmpezar, ejemplo (función opcional) }
    instrucciones(cfg, conjunto, listas, info) {
      const secuencial = cfg.presentacion === 'secuencial';
      const S = cfg.secuencial || {};
      const D = cfg.distraccion || {};
      const seg = (ms) => String(ms / 1000).replace('.', ',') + ' s';
      $('ins-parte').textContent = info.parte || '';
      $('ins-titulo').textContent = info.primera ? 'Instrucciones' : 'Siguiente parte';
      const es2D = cfg.dimension === '2d';
      const figuras = es2D ? 'planas hechas de cuadrados' : 'hechas de cubos';
      // Aviso si cambia el tipo de figura respecto al bloque anterior (3D → 2D o 2D → 3D)
      const cambioFiguras = es2D
        ? (this.ultimaDimension !== '2d' ? ' Ahora las figuras son <b>planas</b>, hechas de cuadrados, y giran sobre la pantalla.' : '')
        : (this.ultimaDimension === '2d' ? ' Ahora las figuras vuelven a ser <b>tridimensionales</b>, hechas de cubos.' : '');
      $('ins-intro').innerHTML = info.primera
        ? `En cada pantalla aparecen dos figuras ${figuras}. La de la derecha está <b>girada</b>. Decide si es:`
        : 'Es la misma tarea: decide si la figura de la derecha es la <b>misma</b> que la de la izquierda, girada, o su <b>imagen en espejo</b>.' +
          cambioFiguras + (secuencial ? ' Pero ahora <b>las dos figuras no salen a la vez</b>.' : '');

      const figEj = conjunto.figuras.find(f => f.practica) || conjunto.figuras[0];
      const W = this.viewport().W;
      const tam = Math.floor(W <= 720 ? Math.min(150, (W - 90) / 2) : Math.min(150, (Math.min(W, 860) - 150) / 4));
      for (const tipo of ['igual', 'espejo']) {
        const e = { figura: figEj.id, tipo, angulo: 100, signo: 1, eje: cfg.ejeRotacion === 'aleatorio' ? 'plano' : cfg.ejeRotacion };
        MR.dibujarPar($(`ej-${tipo}-1`), $(`ej-${tipo}-2`), conjunto, e, cfg, tam);
      }
      $('ins-teclas').hidden = this.tactil;
      $('ins-tactil').hidden = !this.tactil;

      const li = [];
      const nP = info.practica || 0, nT = listas.test.length;
      if (secuencial) {
        li.push(`Primero verás <b>solo la figura de la izquierda</b>, durante ${seg(S.primeraMs)}. Después desaparecerá y verás ` +
          `<b>solo la de la derecha</b>${S.segundaMs ? `, durante ${seg(S.segundaMs)}` : ''}. Tendrás que <b>recordar la primera</b> ` +
          'para decidir si la segunda es la misma figura girada o su imagen en espejo.');
        li.push('Puedes responder en cuanto aparezca la segunda figura, y también cuando ya haya desaparecido.');
      }
      if (nP) li.push(`Primero harás <b>${nP} pares de práctica</b>, con aviso de si aciertas. No cuentan.`);
      li.push(nP ? `Después vendrán <b>${nT} pares</b> sin aviso.` : `Son <b>${nT} pares</b>, sin aviso de acierto o error.`);
      if (cfg.limiteRespuestaMs) li.push(`Cada par se queda en pantalla como máximo <b>${cfg.limiteRespuestaMs / 1000} s</b>. Si no respondes, pasa al siguiente.`);
      else li.push('No hay límite de tiempo, pero <b>se mide cuánto tardas</b>: responde en cuanto lo tengas claro.');
      if (cfg.tiempoExposicionMs && !secuencial) li.push(`Las figuras solo se ven durante <b>${seg(cfg.tiempoExposicionMs)}</b> y después desaparecen. Puedes responder después, sin prisa.`);
      if (D.activa) {
        const que = [D.sonido && 'sonarán <b>pitidos</b>', D.imagen && 'aparecerán <b>formas de colores</b> alrededor de las figuras'].filter(Boolean).join(' y ');
        li.push(`${D.probabilidad >= 1 ? 'Durante toda esta parte' : 'En muchos pares'} ${que}, a veces antes incluso de que salgan las figuras. ` +
          '<b>Ignóralos</b> y concéntrate en las figuras.');
      }
      li.push('Entre par y par verás una cruz <b>+</b> en el centro: mira hacia ella.');
      li.push('Intenta ser <b>rápido/a y preciso/a</b> a la vez.');
      $('lista-instrucciones').innerHTML = li.map(x => `<li>${x}</li>`).join('');

      const aviso = info.aviso || ((this.tactil && this.viewport().H > this.viewport().W)
        ? '📱 Consejo: pon el móvil en <b>horizontal</b>. Las figuras se verán más grandes.' : '');
      $('ins-aviso').innerHTML = aviso;
      $('ins-aviso').hidden = !aviso;
      const btn = $('btn-empezar'), btnEj = $('btn-ejemplo');
      btn.textContent = nP ? 'Empezar la práctica' : 'Empezar';
      btnEj.hidden = !info.ejemplo;
      btnEj.textContent = 'Ver un ejemplo';
      this.mostrar('p-instrucciones');
      return new Promise(res => {
        btn.onclick = () => { btn.onclick = btnEj.onclick = null; if (info.alEmpezar) info.alEmpezar(); res(); };
        btnEj.onclick = async () => {
          btnEj.disabled = true;
          MR.Distractores.activarAudio();
          await info.ejemplo();
          btnEj.disabled = false;
          btnEj.textContent = 'Ver otro ejemplo';
          this.mostrar('p-instrucciones');
        };
      });
    },

    /* ---------------- un bloque completo ---------------- */
    // ctx: datos de la sesión completa (participante, entorno, grupo, modalidad, orden, ajustes…)
    // info: { posicion, total, primera, alGuardar(sesion), sinSonido: 'omitir' | 'continuar' }
    async correrBloque(ctx, clave, info) {
      let cfg = ctx.cfgPersonalizada ? ctx.cfgPersonalizada : MR.configDeCondicion(clave);
      if (ctx.ajustes) cfg = MR.mezclarProfundo(cfg, ctx.ajustes);
      if (ctx.sufijo) cfg.condicion += ctx.sufijo;
      const conjunto = MR.generarConjunto(cfg);
      const codigo = ctx.participante.codigo;
      const semillaOrden = cfg.ordenFijo ? cfg.semilla + 1 : MR.hashTexto(codigo + '|' + cfg.condicion + '|' + Date.now());
      const listas = MR.construirEnsayos(cfg, conjunto, semillaOrden);
      const rng = MR.crearRng(MR.hashTexto(codigo + '|' + cfg.condicion + '|' + Date.now()));
      const ahora = new Date();
      const sesion = {
        id: codigo + '_' + MR.claveBase(cfg.condicion) + '_' + ahora.getTime().toString(36),
        inicio: ahora.toISOString(), fin: null, estado: 'incompleta',
        condicion: cfg.condicion, semillaOrden,
        modalidad: ctx.modalidad || 'laboratorio', grupo: ctx.grupo,
        posicion_bloque: info.posicion, bloques_total: info.total,
        orden_bloques: ctx.ordenBloques || '', origen: ctx.origen || '', prueba: ctx.prueba ? 1 : 0,
        sonido_comprobado: '', practica_repetida: 0,
        participante: ctx.participante, cuestionarioFinal: {}, entorno: ctx.entorno,
        config: cfg,
        figuras: conjunto.figuras.map(f => ({ id: f.id, practica: f.practica, cubos: f.cubosEnteros, pose: f.poseInfo })),
        ensayos: []
      };
      const guardar = () => { if (info.alGuardar) info.alGuardar(sesion); };
      const parte = info.total > 1 ? `Parte ${info.posicion} de ${info.total}` : '';
      const D = cfg.distraccion || {};
      if (info.primera) this.ultimaDimension = null;   // empieza una sesión nueva
      asignarDistraccion(listas.test, cfg);
      // La práctica solo se hace en el primer bloque de la sesión (sea cual sea el test que toque primero)
      const hacerPractica = listas.practica.length > 0 && (!cfg.practica.soloPrimerBloque || info.primera);
      const est = { cfg, conjunto, rng, sesion, guardar };

      // 1) comprobación de sonido (antes de las instrucciones del bloque con pitidos)
      if ((D.activa && D.sonido) || (cfg.distractorSonoro && cfg.distractorSonoro.activo)) {
        sesion.sonido_comprobado = await this.comprobarSonido({
          parte, volumen: D.activa ? D.volumen : cfg.distractorSonoro.volumen,
          textoSaltar: info.sinSonido === 'omitir' ? 'No puedo usar sonido: saltar esta parte' : 'Seguir sin sonido'
        });
        if (sesion.sonido_comprobado === 'no' && info.sinSonido === 'omitir') {
          sesion.estado = 'omitido'; sesion.fin = new Date().toISOString();
          guardar();
          return sesion;
        }
      }

      // 2) instrucciones; el clic en «Empezar» activa el audio y la pantalla completa.
      //    Sin práctica y con presentación secuencial, se ofrece «Ver un ejemplo» (no cuenta).
      let nEjemplo = 0;
      await this.instrucciones(cfg, conjunto, listas, {
        parte, primera: info.primera, practica: hacerPractica ? listas.practica.length : 0,
        ejemplo: (!hacerPractica && cfg.presentacion === 'secuencial' && listas.practica.length)
          ? () => this.correrEjemplo(est, listas.practica[nEjemplo++ % listas.practica.length]) : null,
        alEmpezar: () => {
          MR.Distractores.activarAudio();
          if (cfg.pantallaCompleta) this.pedirPantallaCompleta();
          this.mantenerEncendida(true);
        }
      });

      // 3) práctica, que se repite una vez si acierta menos de minAciertos
      if (hacerPractica) {
        const min = cfg.practica.minAciertos || 0, maxRep = cfg.practica.maxRepeticiones || 0;
        for (let intento = 1; ; intento++) {
          const regs = await this.correrLista(est, listas.practica, 'practica', (intento - 1) * listas.practica.length);
          const ok = regs.filter(r => r.acierto === 1).length;
          if (ok >= min || intento > maxRep) break;
          sesion.practica_repetida = 1;
          guardar();
          await this.mensaje({
            etiqueta: parte, titulo: 'Vamos a repetir la práctica', boton: 'Repetir la práctica',
            html: `<p>Has acertado <b>${ok} de ${regs.length}</b>.</p>
              <p>Recuerda: <b>Igual</b> = la misma figura, solo que girada. <b>Espejo</b> = su imagen reflejada,
              como tu mano izquierda y la derecha: por mucho que la gires, nunca coincide.</p>`
          });
        }
        await this.mensaje({
          etiqueta: parte, titulo: 'Fin de la práctica', boton: 'Empezar',
          html: `<p>Ahora empieza la parte que cuenta: <b>${listas.test.length} pares</b>, ya sin aviso de acierto o error.</p>`
        });
      }

      // 4) pares del test
      await this.correrLista(est, listas.test, 'test', 0);
      this.ultimaDimension = cfg.dimension === '2d' ? '2d' : '3d';
      sesion.estado = 'completa';
      sesion.fin = new Date().toISOString();
      sesion.resumen = MR.resumir(sesion.ensayos, cfg);
      guardar();
      return sesion;
    },

    async correrLista(est, lista, bloque, desplazamiento) {
      const { cfg } = est;
      this.mostrar('p-ensayo');
      $('fila-ensayo').querySelectorAll('.btn.resp').forEach(b => { b.style.display = cfg.botonesEnPantalla ? '' : 'none'; });
      const regs = [];
      for (let i = 0; i < lista.length; i++) {
        if (bloque === 'test' && cfg.pausaCada && i > 0 && i % cfg.pausaCada === 0) {
          await this.mensaje({ titulo: 'Descanso', html: `<p>Llevas ${i} de ${lista.length} pares. Descansa unos segundos y continúa cuando quieras.</p>` });
          this.mostrar('p-ensayo');
        }
        $('contador').textContent = cfg.mostrarContador ? `${bloque === 'practica' ? 'Práctica · ' : ''}${i + 1} / ${lista.length}` : '';
        $('progreso').style.width = cfg.mostrarBarraProgreso ? (100 * i / lista.length) + '%' : '0';
        const reg = await this.correrEnsayo(est, lista[i], bloque);
        if (desplazamiento) reg.ensayo += desplazamiento; // práctica repetida: ensayos 5-8
        regs.push(reg);
        est.sesion.ensayos.push(reg);
        est.guardar();
      }
      $('progreso').style.width = '100%';
      return regs;
    },

    /* ---------------- tamaño y disposición de las figuras ---------------- */
    // Zona visible. En el móvil, innerWidth crece si algo se sale de la pantalla;
    // clientWidth y visualViewport dan lo que se ve de verdad.
    viewport() {
      const de = document.documentElement, vv = window.visualViewport;
      const W = Math.min(de.clientWidth || window.innerWidth, window.innerWidth);
      const H = vv ? Math.min(vv.height, window.innerHeight) : window.innerHeight;
      return { W, H };
    },
    // Móvil en horizontal: botones a los lados de las figuras, para aprovechar la altura.
    disposicion() {
      const { W, H } = this.viewport();
      const lateral = this.tactil && W > H && H < 600;
      $('p-ensayo').classList.toggle('lateral', lateral);
      return lateral;
    },
    tamFigura(cfg) {
      const { W, H } = this.viewport();
      let porAncho, porAlto;
      if (this.disposicion()) {
        const botones = 2 * Math.min(120, Math.max(84, W * 0.12));
        porAncho = Math.floor((W - botones - 3 * 12 - 10 - 16) / 2);
        porAlto = Math.floor(H - 96);
      } else {
        porAncho = Math.floor((W - 24 - (W <= 720 ? 10 : 32) - 6) / 2);
        porAlto = Math.floor(H - 230);
      }
      return Math.max(110, Math.min(cfg.tamanoFigura, porAncho, porAlto));
    },

    // Un par de ejemplo (no se guarda): sirve para ver cómo es la presentación secuencial sin hacer práctica
    async correrEjemplo(est, e) {
      this.mostrar('p-ensayo');
      $('fila-ensayo').querySelectorAll('.btn.resp').forEach(b => { b.style.display = est.cfg.botonesEnPantalla ? '' : 'none'; });
      $('contador').textContent = 'Ejemplo (no cuenta)';
      $('progreso').style.width = '0';
      await this.correrEnsayo(est, e, 'practica');
    },

    /* ---------------- un par ---------------- */
    // Simultánea: cruz → las dos figuras (hasta responder, o tiempoExposicionMs) → respuesta.
    // Secuencial: cruz → solo la izquierda (primeraMs) → máscara → vacío → solo la derecha (segundaMs) → respuesta.
    //   El TR cuenta desde que aparece la segunda figura.
    // Distracción: empieza durante la cruz (antesMs antes de las figuras) y sigue hasta la respuesta.
    async correrEnsayo(est, e, bloque) {
      const { cfg, conjunto, rng } = est;
      const izq = $('lienzo-izq'), der = $('lienzo-der'), fij = $('fijacion'), fb = $('feedback');
      const tam = this.tamFigura(cfg);
      const secuencial = cfg.presentacion === 'secuencial';
      const S = cfg.secuencial || {};
      const D = cfg.distraccion || {};
      const conDistraccion = !!(D.activa && e.conDistraccion && bloque === 'test');
      const fig = conjunto.porId[e.figura];
      const mats = MR.matricesPar(fig, e, cfg);
      const vaciar = (c) => MR.dibujarEnLienzo(c, null, null, cfg, conjunto, tam);
      const timers = [];
      fb.textContent = ''; fb.className = 'feedback';

      // 1) cruz de fijación; la distracción arranca antes de que acabe
      vaciar(izq); vaciar(der);
      fij.classList.add('visible');
      let distraccion = null, distraccionEn = null;
      if (conDistraccion) {
        const antes = Math.min(cfg.fijacionMs, D.antesMs[0] + rng() * (D.antesMs[1] - D.antesMs[0]));
        timers.push(setTimeout(() => {
          const zona = $('zona-ensayo'), zr = zona.getBoundingClientRect(), pr = $('par').getBoundingClientRect();
          distraccionEn = performance.now();
          distraccion = MR.Distractores.continua({
            sonido: D.sonido, imagen: D.imagen, contenedor: zona, volumen: D.volumen, rng,
            evitar: { left: pr.left - zr.left, top: pr.top - zr.top, right: pr.right - zr.left, bottom: pr.bottom - zr.top },
            pitidoCadaMs: D.pitidoCadaMs, formaCadaMs: D.formaCadaMs, formaDuracionMs: D.formaDuracionMs
          });
        }, Math.max(0, cfg.fijacionMs - antes)));
      }
      await esperar(cfg.fijacionMs);

      // 2) figuras
      if (secuencial) {
        MR.dibujarEnLienzo(izq, fig, mats.izq, cfg, conjunto, tam);           // solo la izquierda
        fij.classList.remove('visible');
        await siguienteFrame();
        await esperar(S.primeraMs);
        if (S.mascaraMs > 0) { MR.dibujarMascara(izq, cfg, rng, tam); await esperar(S.mascaraMs); }
        vaciar(izq);
        if (S.intervaloMs > 0) await esperar(S.intervaloMs);
        MR.dibujarEnLienzo(der, fig, mats.der, cfg, conjunto, tam, mats.luzDer); // solo la derecha
      } else {
        MR.dibujarPar(izq, der, conjunto, e, cfg, tam);
        fij.classList.remove('visible');
      }
      const inicio = await siguienteFrame(); // momento (aprox.) en que se pinta la figura que hay que juzgar

      // 3) exposición limitada (secuencial: la segunda figura; simultánea: tiempoExposicionMs)
      let ocultadoEn = null;
      const ocultarMs = secuencial ? S.segundaMs : cfg.tiempoExposicionMs;
      const mascara = secuencial ? S.mascaraMs : cfg.mascaraMs;
      if (ocultarMs) {
        const lienzos = secuencial ? [der] : [izq, der];
        timers.push(setTimeout(() => {
          ocultadoEn = performance.now();
          if (mascara > 0) {
            lienzos.forEach(c => MR.dibujarMascara(c, cfg, rng, tam));
            timers.push(setTimeout(() => lienzos.forEach(vaciar), mascara));
          } else lienzos.forEach(vaciar);
        }, ocultarMs));
      }
      let cambiosPestana = 0;
      const alCambiar = () => { if (document.hidden) cambiosPestana++; };
      document.addEventListener('visibilitychange', alCambiar);

      // 4) respuesta (las teclas pulsadas antes de que aparezca la figura no cuentan)
      const r = await this.esperarRespuesta(cfg);
      timers.forEach(clearTimeout);
      const resD = distraccion ? distraccion.parar() : null;
      document.removeEventListener('visibilitychange', alCambiar);

      const tr = r.respuesta ? Math.round((r.t - inicio) * 10) / 10 : '';
      const acierto = r.respuesta ? (r.respuesta === e.tipo ? 1 : 0) : '';

      // 5) aviso de acierto (práctica y ejemplo)
      if (bloque === 'practica' && cfg.practica.feedback) {
        if (!r.respuesta) { fb.textContent = 'Sin respuesta · era ' + e.tipo.toUpperCase(); fb.classList.add('mal'); }
        else if (acierto) { fb.textContent = '¡Correcto! Era ' + e.tipo.toUpperCase(); fb.classList.add('ok'); }
        else { fb.textContent = 'Incorrecto · era ' + e.tipo.toUpperCase(); fb.classList.add('mal'); }
        if (cfg.tiempoExposicionMs || secuencial) MR.dibujarPar(izq, der, conjunto, e, cfg, tam); // enseña el par entero
        await esperar(cfg.practica.feedbackMs);
      }

      const onset = distraccionEn !== null ? Math.round(distraccionEn - inicio) : ''; // negativo = antes de la figura
      return {
        bloque, ensayo: e.ensayo, figura: e.figura, angulo: e.angulo, signo_giro: e.signo,
        eje: e.eje === 'aleatorio' ? 'aleatorio[' + e.vectorEje.join(' ') + ']' : e.eje,
        tipo: e.tipo, respuesta: r.respuesta || '', acierto, tr_ms: tr,
        sin_respuesta: r.respuesta ? 0 : 1, medio_respuesta: r.medio,
        respondio_tras_ocultar: (r.respuesta && ocultadoEn !== null && r.t >= ocultadoEn) ? 1 : 0,
        limite_ms: cfg.limiteRespuestaMs || '', exposicion_ms: (!secuencial && cfg.tiempoExposicionMs) || '',
        // *_programado = el par tenía distracción asignada; onset negativo = empezó antes de la figura
        distractor_sonoro_programado: conDistraccion && D.sonido ? 1 : 0,
        distractor_visual_programado: conDistraccion && D.imagen ? 1 : 0,
        distractor_sonoro: resD && resD.pitidos ? 'pitidos' : '', distractor_sonoro_detalle: resD && D.sonido ? `${resD.pitidos} pitidos` : '',
        distractor_sonoro_onset_ms: resD && D.sonido ? onset : '',
        distractor_visual: resD && resD.formas ? 'formas' : '', distractor_visual_detalle: resD && D.imagen ? `${resD.formas} formas` : '',
        distractor_visual_onset_ms: resD && D.imagen ? onset : '',
        cambios_pestana: cambiosPestana, visibilidad_min: e.visibilidadMin,
        tam_figura_px: tam, orientacion: this.viewport().W >= this.viewport().H ? 'horizontal' : 'vertical',
        presentacion: secuencial ? 'secuencial' : 'simultanea',
        primera_ms: secuencial ? S.primeraMs : '',
        intervalo_ms: secuencial ? (S.mascaraMs || 0) + (S.intervaloMs || 0) : '',
        segunda_ms: secuencial ? (S.segundaMs || '') : '',
        fecha_hora: new Date().toISOString()
      };
    },

    esperarRespuesta(cfg) {
      const zona = $('fila-ensayo');
      const limiteMs = cfg.limiteRespuestaMs;
      return new Promise(res => {
        let hecho = false, to = null;
        const marca = (ev) => (ev.timeStamp > 0 && ev.timeStamp < 1e11) ? ev.timeStamp : performance.now();
        const fin = (r) => {
          if (hecho) return; hecho = true;
          document.removeEventListener('keydown', tecla);
          zona.removeEventListener('pointerdown', clic);
          if (to) clearTimeout(to);
          res(r);
        };
        const tecla = (ev) => {
          if (ev.repeat) return;
          let r = null;
          if (cfg.teclas.igual.includes(ev.key)) r = 'igual';
          else if (cfg.teclas.espejo.includes(ev.key)) r = 'espejo';
          if (!r) return;
          ev.preventDefault();
          fin({ respuesta: r, t: marca(ev), medio: 'teclado' });
        };
        const clic = (ev) => {
          const b = ev.target.closest('[data-resp]'); if (!b) return;
          ev.preventDefault(); b.blur();
          fin({ respuesta: b.dataset.resp, t: marca(ev), medio: ev.pointerType === 'touch' ? 'tactil' : 'raton' });
        };
        document.addEventListener('keydown', tecla);
        zona.addEventListener('pointerdown', clic);
        if (limiteMs) to = setTimeout(() => fin({ respuesta: null, t: performance.now(), medio: '' }), limiteMs);
      });
    },

    /* ---------------- cuestionario final ---------------- */
    cuestionarioFinal(preguntas) {
      $('final-preguntas').innerHTML = preguntas.map(p => `
        <label class="${p.ancho ? 'ancho' : ''}">${p.texto}
          <select id="q-${p.id}" required>
            <option value="">—</option>
            ${p.opciones.map(o => Array.isArray(o) ? `<option value="${o[0]}">${o[1]}</option>` : `<option>${o}</option>`).join('')}
          </select>
        </label>`).join('');
      this.mostrar('p-final');
      return new Promise(res => {
        const form = $('form-final');
        form.onsubmit = (ev) => {
          ev.preventDefault();
          form.onsubmit = null;
          const r = {};
          preguntas.forEach(p => { r[p.id] = $('q-' + p.id).value; });
          res(r);
        };
      });
    },

    /* ---------------- datos del dispositivo ---------------- */
    entorno() {
      const w = Math.min(screen.width, screen.height);
      return {
        dispositivo: this.tactil ? (w < 600 ? 'movil' : 'tablet') : 'ordenador',
        pantalla: `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}`,
        ventana: `${window.innerWidth}x${window.innerHeight}`,
        navegador: navigator.userAgent,
        idioma: navigator.language || ''
      };
    }
  };
})();
