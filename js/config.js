/* =====================================================================
 *  CONFIGURACIÓN DEL TEST DE ROTACIÓN MENTAL
 * ---------------------------------------------------------------------
 *  Aquí están TODOS los parámetros del experimento.
 *
 *  - CONFIG_BASE: valores por defecto.
 *  - CONDICIONES: cada condición solo cambia algunos valores de la base.
 *    Se elige en la pantalla inicial (Ajustes del experimentador) o con
 *    la URL:  index.html?condicion=secuencial&participante=P01
 *
 *  Para crear una condición nueva, copia una de las de abajo, cambia el
 *  nombre de la clave y los valores que quieras.
 * ===================================================================== */
window.MR = window.MR || {};

MR.CONFIG_BASE = {
  /* ---------- Estímulos ---------- */
  dimension: '3d',            // '3d' = figuras de cubos (Shepard-Metzler) | '2d' = figuras planas de cuadrados (control)
  semilla: 20261117,          // misma semilla = mismas figuras y mismos pares para todos
  numFiguras: 8,              // figuras distintas usadas en el test
  numFigurasPractica: 2,      // figuras extra que solo salen en la práctica
  cubosPorFigura: 10,         // diseño de Shepard y Metzler (1971)
  brazosPorFigura: 4,         // tramos rectos con giro de 90° entre ellos
  pasosPorBrazo: { min: 2, max: 4, minExtremos: 1 }, // longitud de cada brazo (en cubos añadidos)
  visibilidadMinima: 0.3,     // fracción mínima visible de cada cubo (0-1)
  diferenciaMinimaCubos: 2,   // cada figura difiere de las demás (y de sus espejos) en ≥ 2 cubos
                              // (con brazos 2-4 caben ~21 figuras así; con 3 solo caben 8)

  angulos: [0, 50, 100, 150], // grados de giro de la figura derecha
  ejeRotacion: 'plano',       // 'plano' (giro en la imagen) | 'profundidad' (eje vertical) | 'aleatorio' (eje 3D al azar)
  sentidoGiro: 'aleatorio',   // 'aleatorio' (equilibrado) | 'horario' | 'antihorario'
  giroProfundidadFijo: 15,    // grados. Pequeño giro en profundidad: así ni los pares de 0° son copias exactas
  espejo: 'horizontal',       // 'horizontal' (izquierda-derecha, como dos manos) | 'vertical' (arriba-abajo)

  ensayosPorCelda: 6,         // pares por combinación ángulo × tipo. 4 ángulos × 2 tipos × 6 = 48 pares
  ordenFijo: true,            // true: todos ven el mismo orden. false: orden aleatorio por participante
  maxMismoTipoSeguidos: 3,    // máx. pares seguidos del mismo tipo (igual/espejo)

  /* ---------- Práctica ---------- */
  practica: {
    activa: true,
    angulos: [0, 100],        // 2 ángulos × 2 tipos = 4 pares de práctica
    feedback: true,           // mostrar si acertó
    feedbackMs: 1300,
    minAciertos: 3,           // si acierta menos de 3 de 4, se repite la práctica…
    maxRepeticiones: 1,       // …como mucho 1 vez (luego sigue igualmente; queda anotado en practica_repetida)
    soloPrimerBloque: true    // en una sesión completa, práctica solo en el primer bloque (el Estudio 1)
  },

  /* ---------- Presentación de las figuras ---------- */
  presentacion: 'simultanea', // 'simultanea' (las dos a la vez) | 'secuencial' (primero la izquierda sola, luego la derecha sola)
  secuencial: {
    primeraMs: 2000,          // la figura de la izquierda se ve sola durante 2 s
    mascaraMs: 300,           // máscara para borrar la imagen de la retina
    intervaloMs: 500,         // pantalla vacía antes de la segunda figura
    segundaMs: 2000           // la de la derecha se ve sola 2 s (null = hasta que responda). El TR cuenta desde que aparece
  },

  /* ---------- Tiempos (milisegundos) ---------- */
  fijacionMs: 500,            // cruz de fijación entre pares
  limiteRespuestaMs: null,    // null = sin límite. 7500 = como neuropsych.io
  tiempoExposicionMs: null,   // null = figuras visibles hasta responder. 3000 = se ocultan a los 3 s
  mascaraMs: 300,             // máscara visual tras ocultar las figuras (0 = sin máscara)
  pausaCada: 0,               // 0 = sin descansos. 24 = descanso cada 24 pares

  /* ---------- Respuesta ---------- */
  teclas: {
    igual: ['ArrowLeft', 'f', 'F'],
    espejo: ['ArrowRight', 'j', 'J']
  },
  botonesEnPantalla: true,
  pantallaCompleta: true,     // pedir pantalla completa al empezar

  /* ---------- Apariencia ---------- */
  tamanoFigura: 320,          // px de cada recuadro de figura (en ordenador)
  estilo: {
    sombreado: '3tonos',      // '3tonos' (como neuropsych) | 'lambert' (sombreado continuo)
    luzGiraConImagen: true,   // giro en el plano: la luz gira con la figura (como girar una foto).
                              // false = luz fija arriba (a 150° la figura parece iluminada desde abajo)
    tonos: ['#a8e6dc', '#1d9c8d', '#0c544d'], // claro, medio, oscuro
    borde: '#0a2523',
    grosorBorde: 1.3,
    fondo: '#ffffff'
  },
  mostrarContador: true,
  mostrarBarraProgreso: true,
  mostrarResultadosAlParticipante: true,
  cuestionarioFinal: true,    // estrategia, dificultad, concentración y cansancio al terminar

  /* ---------- Distracción (Estudio 2: test con distracción) ---------- */
  // Pitidos y formas de colores A LA VEZ, que empiezan durante la cruz (antes que las figuras)
  // y se repiten sin parar hasta que la persona responde.
  distraccion: {
    activa: false,
    probabilidad: 1,          // fracción de pares con distracción: 1 = todos. Con 0.75, 1 de cada 4 pares va sin
                              // distracción (repartidos por igual entre ángulos y tipos) para comparar dentro del bloque
    sonido: true,             // pitidos
    imagen: true,             // formas de colores alrededor de las figuras (sin taparlas)
    antesMs: [150, 400],      // empieza entre 150 y 400 ms ANTES de que aparezcan las figuras
    pitidoCadaMs: [350, 900], // un pitido cada 350-900 ms
    formaCadaMs: [150, 400],  // una forma nueva cada 150-400 ms (unas 3 a la vez)
    formaDuracionMs: 800,     // cada forma se ve unos 0,8 s; aparece y desaparece suave (sin destellos bruscos)
    volumen: 0.35
  },

  /* ---------- Distractores antiguos (un solo estímulo por par, con retraso) ---------- */
  // Ya no se usan: los sustituye `distraccion`. Se mantienen porque ensayos.js los lee: déjalos con activo: false.
  distractorSonoro: {
    activo: false,
    tipo: 'pitidos',          // 'pitidos' | 'ruido' | 'voz' (números dichos en voz alta) | 'mezcla'
    probabilidad: 0.5,
    retrasoMs: [150, 1200],
    volumen: 0.35
  },
  distractorVisual: {
    activo: false,
    tipo: 'destellos',        // 'destellos' | 'puntos' (puntos en movimiento) | 'mezcla'
    probabilidad: 0.5,
    retrasoMs: [150, 1200],
    duracionMs: 900
  }
};

MR.CONDICIONES = {
  /* ---- Estudio 1: test normal, el que se compara con la IA ---- */
  sin_limite: {
    nombre: 'Estudio 1 · Test normal, sin límite de tiempo (48 pares)',
    cambios: {}
  },
  /* ---- Estudio 2: test con distracción (solo personas) ---- */
  distraccion: {
    nombre: 'Estudio 2 · Test con distracción: pitidos y formas de colores en todos los pares (32 pares)',
    cambios: { ensayosPorCelda: 4, distraccion: { activa: true } }
  },
  /* ---- Control 2D: figuras planas (lo hacen las personas y la IA) ---- */
  control_2d: {
    nombre: 'Control 2D · Figuras planas de 10 cuadrados, mismo diseño (48 pares)',
    cambios: { dimension: '2d' }
  },
  /* ---- Variantes adicionales (no forman parte de la sesión) ---- */
  neuropsych: {
    nombre: 'Extra · Réplica de neuropsych.io (máximo 7,5 s por par)',
    cambios: { limiteRespuestaMs: 7500 }
  },
  profundidad: {
    nombre: 'Extra · Giro en profundidad (eje vertical, como Shepard y Metzler)',
    cambios: { ejeRotacion: 'profundidad' }
  },
  angulos_finos: {
    nombre: 'Extra · Más ángulos: de 0° a 180° cada 30°',
    cambios: { angulos: [0, 30, 60, 90, 120, 150, 180], ensayosPorCelda: 4 }
  },
  secuencial: {
    nombre: 'Extra · Presentación secuencial: primero una figura y luego la otra, 2 s cada una (retirada del estudio)',
    cambios: { ensayosPorCelda: 4, presentacion: 'secuencial' }
  },
  demo_corta: {
    nombre: 'Demo corta (para probar: 8 pares)',
    cambios: { ensayosPorCelda: 1, pantallaCompleta: false }
  }
};

/* =====================================================================
 *  SESIÓN COMPLETA: test normal (Estudio 1), test con distracción (Estudio 2)
 *  y control 2D, en un ORDEN QUE CAMBIA DE UN PARTICIPANTE A OTRO (contrabalanceo)
 * ===================================================================== */
MR.SESION = {
  // Tests de la sesión. Los tres los hacen todas las personas (y también la IA, salvo la distracción,
  // que la IA hace con su análogo). El control 2D permite comparar personas e IA en 2D y en 3D.
  bloques: ['sin_limite', 'distraccion', 'control_2d'],
  // Descanso entre tests: el botón «Siguiente parte» se activa a los descansoMinimoS segundos (igual para todos).
  // Se guarda lo que ha descansado cada persona de verdad antes de cada test (columna descanso_previo_ms).
  descansoMinimoS: 10
  // Orden: se usan todas las permutaciones de los tests elegidos (con 3 tests, 6 órdenes; con 2, 2).
  //  · Laboratorio: según el número del código. P01 hace el 1.º orden, P02 el 2.º… P06 el 6.º,
  //    P07 vuelve al 1.º, y así sucesivamente (con 6, 12, 18… participantes queda equilibrado).
  //  · Online: una permutación al azar.
  // La práctica se hace siempre al principio de la sesión, sea cual sea el primer test, y con figuras
  // de la misma dimensión (3D o 2D) que ese primer test.
  // Se guarda el orden (columna orden_bloques) y la posición de cada test (posicion_bloque).
};

/* ---------- Laboratorio (index.html) ---------- */
MR.LAB = {
  descargaAutomatica: true    // al terminar la sesión se descarga sola el CSV (además de la copia del navegador)
};

/* ---------- Versión online para compartir por WhatsApp (participar.html) ---------- */
MR.ONLINE = {
  // URL de la aplicación web de Google Apps Script que guarda los datos en una hoja de cálculo
  // (ver online/INSTRUCCIONES_ONLINE.md). Vacía = sin envío automático: al final el participante
  // envía su archivo por WhatsApp o lo descarga.
  urlEnvio: 'https://script.google.com/macros/s/AKfycbzm9CICxiAJ_3vVlqopRUPGP7GIYNDxJkWhMd4hDca8Xm0ySbnxcVDz873_1NHPhhWd/exec',
  // Dirección pública del test una vez publicado (p. ej. https://usuario.github.io/rotacion/participar.html).
  // Se usa en el botón «Compartir por WhatsApp». Vacía = la dirección de la página actual.
  enlacePublico: 'https://feduchyy.github.io/rotacion-mental/participar.html',
  // Correo de contacto para dudas o para pedir que se borren los datos. Vacío = no se muestra.
  contacto: '',
  responsables: 'un grupo de estudiantes de Neurociencia Cognitiva e IA de la Universidad Francisco de Vitoria (UFV)',
  estudio2: true,             // false = solo el test normal (unos 5 minutos). También con ?estudio=1 en la URL
  control2D: true,            // true = incluye el control 2D (entra también en el orden al azar)
  edadMinima: 18,
  minutos: 11,                // duración aproximada que se anuncia (versión completa: los tres tests)
  minutosCorta: 5,            // ídem, solo el test normal
  sinSonido: 'continuar',     // si no oye los pitidos: 'continuar' (el test con distracción queda solo con las formas;
                              // anotado en sonido_comprobado = no) u 'omitir' ese test
  textoInvitacion: '🧠 ¿Cuánto tarda tu cerebro en girar una figura? Estamos haciendo un experimento para un trabajo de ' +
    'Neurociencia Cognitiva e IA (UFV) que compara a personas con inteligencias artificiales. Son unos 11 minutos, es anónimo ' +
    'y mejor desde el ordenador o con el móvil en horizontal y con sonido. 👉 {enlace} ¡Gracias!'
};

/* ---------- Cuestionario final (común) ---------- */
MR.PREGUNTAS_FINALES = [
  { id: 'estrategia', texto: '¿Qué estrategia has usado sobre todo?', ancho: true, opciones: [
    ['girar_figura', 'Girar mentalmente la figura entera'], ['comparar_brazos', 'Comparar los brazos uno a uno'],
    ['mixta', 'Una mezcla de las dos'], ['otra', 'Otra / no lo sé']] },
  { id: 'dificultad', texto: 'Dificultad percibida (1 = muy fácil, 5 = muy difícil)', opciones: [1, 2, 3, 4, 5] },
  { id: 'concentracion', texto: 'Concentración (1 = nada, 5 = total)', opciones: [1, 2, 3, 4, 5] },
  { id: 'fatiga', texto: 'Cansancio (1 = nada, 5 = mucho)', opciones: [1, 2, 3, 4, 5] }
];
MR.PREGUNTA_INTERRUPCIONES = { id: 'interrupciones', texto: '¿Te han interrumpido o te has distraído durante el test?', ancho: true, opciones: [
  ['no', 'No'], ['alguna', 'Alguna vez'], ['bastantes', 'Bastantes veces']] };

/* ---------- utilidades de configuración ---------- */
MR.mezclarProfundo = function (base, cambios) {
  const salida = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const k in cambios) {
    const v = cambios[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      salida[k] = MR.mezclarProfundo(base[k], v);
    } else {
      salida[k] = Array.isArray(v) ? v.slice() : v;
    }
  }
  return salida;
};

MR.configDeCondicion = function (clave) {
  const cond = MR.CONDICIONES[clave] || MR.CONDICIONES.sin_limite;
  const cfg = MR.mezclarProfundo(MR.CONFIG_BASE, cond.cambios);
  cfg.condicion = MR.CONDICIONES[clave] ? clave : 'sin_limite';
  return cfg;
};
