# Test de rotación mental (humanos vs IA)

Reconstrucción propia del test de rotación mental de neuropsych.io (paradigma de Shepard y Metzler, 1971). Hemos tomado el diseño de su página informativa y lo hemos programado desde cero. Todo es configurable.

| Página | Para qué |
|---|---|
| **`index.html`** | **Laboratorio** (sesiones presenciales). Panel del experimentador y sesión completa guiada. |
| **`participar.html`** | **Versión online** para compartir por WhatsApp: la persona hace el test sola y los datos llegan a una hoja de Google. Ver [`online/INSTRUCCIONES_ONLINE.md`](online/INSTRUCCIONES_ONLINE.md). |
| **`panel.html`** | **Panel de resultados**: junta los CSV del laboratorio, los online y los de la IA, y dibuja precisión y TR por ángulo y los efectos del Estudio 2. |
| **`estimulos.html`** | Exporta los mismos pares como imágenes para la IA y genera datos de entrenamiento para la red siamesa. |
| **`js/config.js`** | Todos los parámetros, condiciones, el orden del Estudio 2 y la configuración de la versión online. |

No hace falta instalar nada. Funciona en cualquier navegador moderno (Chrome o Edge recomendados) y en el móvil.

---

## 1. Cómo abrirlo

**Opción rápida:** doble clic en `index.html`.

**Opción recomendada** (evita que el navegador use una versión antigua de `config.js` guardada en caché, y permite abrir el test desde otro dispositivo de la misma red):

```bash
python servir.py
```

Luego abre http://localhost:8000. Desde un móvil u otro ordenador de la misma wifi, usa `http://IP-del-ordenador:8000` (por ejemplo, `…/participar.html` para probar la versión online en el móvil).

## 2. Pasar el test en el laboratorio (sesión completa)

1. Abre `index.html`. Aparece el **panel del experimentador**:
   - **Código del participante**: sugiere el siguiente libre (P01, P02…) según lo guardado en ese navegador. Avisa si el código ya tiene datos.
   - **Tests de la sesión**: test normal (Estudio 1, 48 pares), test con distracción (Estudio 2, 32 pares) y control 2D (48 pares con figuras planas), los tres marcados de serie. Se ve el plan, el número de pares (128) y la duración aproximada (unos 11 minutos).
   - **Orden de los tests (contrabalanceo)**: cambia de un participante a otro y se asigna solo según el número del código. Con los tres tests hay 6 órdenes, que van rotando: P01 hace el 1.º, P02 el 2.º… P06 el 6.º y P07 vuelve al 1.º. Si se desmarca un test, con dos tests los impares hacen un orden y los pares, el otro. Se puede elegir a mano.
   - **Demostración**: 8 pares por test. Los datos se guardan marcados como prueba (`prueba = 1`, condición `…_demo`). La casilla se desmarca sola al recargar la página.
2. **Empezar sesión** → el participante rellena sus datos (una sola vez para toda la sesión) y acepta el consentimiento.
3. Cada test sigue estos pasos, con un descanso entre tests de al menos 10 s, igual para todos (`MR.SESION.descansoMinimoS`): el botón «Siguiente parte» se activa al acabar la cuenta atrás y se guarda lo que ha descansado de verdad cada persona (`descanso_previo_ms`, vacío en el primer test):
   - antes del test con distracción, la **comprobación de sonido** («¿Has oído los pitidos?»);
   - instrucciones;
   - **solo al principio de la sesión, sea cual sea el primer test**: 4 pares de práctica con aviso de acierto (sin distracción y con figuras como las de ese test, 3D o 2D). Al pasar de figuras 3D a 2D, o al revés, las instrucciones del test siguiente avisan del cambio. Si acierta menos de 3, la práctica se repite una vez (`practica_repetida = 1`). El resto de la sesión va sin práctica (`practica.soloPrimerBloque`);
   - los pares del test.
4. Al final, el **cuestionario** (una vez) y la pantalla de resultados, con:
   - la gráfica del test normal;
   - una tabla con los tests en el orden en que se hicieron, con la precisión, el TR y la diferencia con el test normal de la misma persona.

   **El CSV de toda la sesión se descarga solo** (`MR.LAB.descargaAutomatica`). Además, cada par se guarda en el navegador en cuanto se responde.
5. En el panel, **Datos guardados en este navegador** lista las sesiones (completas, a medias, prueba). Se pueden descargar por participante o todas juntas, y borrar. Avisa cuando el almacenamiento del navegador (unos 5 MB) se está llenando.

**Un solo bloque** (repetir uno, pilotos, condiciones extra): *Un solo bloque o parámetros personalizados*. Ahí están el selector de condición y el editor JSON de siempre. Un test suelto se puede abrir con un enlace, por ejemplo `index.html?condicion=distraccion&participante=P07`. Al ser el primero de su sesión, lleva práctica.

Respuesta: **← o F = Igual**, **→ o J = Espejo**, o los botones en pantalla. En el **móvil en horizontal**, los botones se colocan a los lados de las figuras para que se vean más grandes.

**Seguridad del participante:** en el test con distracción aparecen y desaparecen formas de colores sin parar. Lo hacen con entrada y salida suaves, no con destellos bruscos. Aun así, en la pantalla de datos aparece un aviso para personas con epilepsia fotosensible.

## 2 bis. Versión online (WhatsApp)

`participar.html` usa el mismo motor y los mismos estímulos. Cambia esto:

- información y consentimiento, con casilla de mayoría de edad;
- código anónimo aleatorio (`W…`);
- el **orden de los tres tests se sortea** para cada persona (uno de los 6) y queda guardado (`orden_bloques`);
- si la persona no oye los pitidos, el test con distracción sigue solo con las formas de colores. Queda anotado (`sonido_comprobado = no`), para excluirla o analizarla aparte. Con `MR.ONLINE.sinSonido = 'omitir'`, en cambio, ese test se salta;
- cada test se **envía a una hoja de Google** en cuanto termina, con confirmación y reintentos;
- al final, resultados personales (test normal y, en una frase, figuras planas) y botón para **compartir el enlace por WhatsApp**. La hoja `sesiones` recibe también `precision_2d`, `tr_mediana_2d` y `pendiente_2d` (`version_test = 3`).

Parámetros de la URL:

| Parámetro | Efecto |
|---|---|
| `?estudio=1` | Versión corta: solo el Estudio 1. |
| `?prueba=1` | Datos marcados como prueba. |
| `?corta=1` | Demostración: 8 pares por bloque. |
| `?origen=grupo3` | Anota de qué grupo viene la persona. |

Puesta en marcha (hoja de Google, publicación gratuita en GitHub Pages, mensaje para WhatsApp y criterios de calidad de los datos): [`online/INSTRUCCIONES_ONLINE.md`](online/INSTRUCCIONES_ONLINE.md).

## 2 ter. Panel de resultados

**Para abrirlo con todos los datos del proyecto:** doble clic en `abrir_panel.bat`, o `python servir.py --panel`. Se abre `http://localhost:8000/panel.html?proyecto=1`, que carga sola la carpeta `muestras/` (hojas `ensayos` y `sesiones`) y los resultados de la IA (`modelo_siames/resultados*` y `test_chat_ia/resultados_chat.csv`). Esos datos solo se sirven a este mismo ordenador. También se pueden arrastrar los CSV al panel, o abrirlo publicado en GitHub Pages y arrastrarlos allí (los datos no se suben a ningún sitio).

Está organizado por hipótesis, con una barra de navegación:

- **Resumen**: tabla de H1–H7 con lo esperado, lo que sale y un veredicto automático (p < 0,05), y cifras clave.
- **Muestra**: del total a la muestra analizada (exclusiones paso a paso), reparto de los 6 órdenes, perfil (edad, género, estudios, dispositivo), duración, descansos y calidad de los datos (respuestas imposibles de < 0,3 s).
- **H1 · Ángulo**: TR y precisión por ángulo (pares iguales y espejo), pendiente de cada persona en los tres tests, ANOVA de medidas repetidas, t de las pendientes, R² del ajuste lineal y velocidad de giro.
- **H7 · 2D frente a 3D**: las mismas personas con las dos versiones (TR, precisión, pendiente persona a persona, respuestas «igual» a pares espejo).
- **H2 · Distracción**: normal frente a distracción por ángulo, intercambio velocidad-precisión persona a persona y efecto según el orden.
- **Orden y práctica**: precisión y TR según la posición del test.
- **H3–H6 · Personas frente a IA**: precisión por ángulo en 3D y 2D, dónde queda cada IA entre las personas y coste de procesamiento relativo a 0° (TR humano frente a tiempo de cálculo de la red).
- **Diferencias individuales**: género, estudios, videojuegos, estrategia, dispositivo y correlaciones (edad, dificultad, concentración, cansancio), con la medida que se elija. Los grupos de menos de 3 personas no se muestran.
- **Participantes**: tabla con el estado de cada persona y el motivo de exclusión.

Cada apartado tiene sus gráficos y una fila de **cifras clave** (cada una con su contraste: t, F o p). No hay textos de interpretación: el panel es solo para ver los datos. Los criterios están en un desplegable arriba. Cada gráfico tiene **«Ver tabla»** y un botón **PNG** para descargarlo (para la memoria). Con Ctrl+P se imprime sin los controles.

Criterios (arriba): quitar los datos de prueba, modalidad, exigir el test normal completo, precisión mínima en el test normal (60 %), quitar a quien respondía sin mirar (TR mediano < 300 ms), quitar pares de < 0,3 s o > 20 s, quitar de la distracción a quien no oyó los pitidos, comprobación sin los tests que no superan el azar y comparación con la IA solo con el test que cada persona hizo primero.

*Añadir datos simulados* carga 36 personas ficticias, marcadas como tales, solo para enseñar cómo se verá. El panel anterior está guardado en `C:\datos_rotacion\copias_panel\`.

## 3. Condiciones predefinidas

| Clave | Qué cambia |
|---|---|
| `sin_limite` · **Estudio 1 · test normal** | 48 pares sin límite de tiempo; se registra el TR. Es el mismo set que se pasa a la IA. |
| `distraccion` · **Estudio 2 · test con distracción** | 32 pares. En **todos** suenan pitidos (uno cada 0,35-0,9 s) y aparecen **a la vez** formas de colores alrededor de las figuras, sin taparlas. La distracción **empieza durante la cruz**, entre 150 y 400 ms antes que las figuras, y sigue hasta la respuesta: no da tiempo a contestar antes de que aparezca. |
| `control_2d` · **Control 2D** (personas e IA) | Versión plana: figuras de 10 cuadrados en 4 brazos, mismos ángulos (giro en el plano), mismo espejo y 48 pares, sin profundidad ni sombreado. Desde el 21/11 forma parte de la sesión de las personas. Sirve para ver si la IA y las personas fallan por la tridimensionalidad o por el giro, y para comparar ambas en 2D y en 3D. |
| `neuropsych` (extra) | Como neuropsych.io: el par desaparece a los 7,5 s y cuenta como omisión. |
| `profundidad` (extra) | Giro alrededor del eje vertical, en profundidad, como en el artículo original. |
| `angulos_finos` (extra) | 7 ángulos: 0°, 30°, …, 180°. |
| `secuencial` (extra, retirada del estudio) | Primero solo la figura de la izquierda (2 s) → máscara → solo la de la derecha (2 s). Se retiró el 21/11 porque solo tiene sentido en personas (no se puede aplicar a la IA) y alargaba la sesión. En sus instrucciones hay un botón «Ver un ejemplo». |
| `demo_corta` | 8 pares, para probar. |

**Orden de los tests (contrabalanceo).** En la sesión completa, el orden de los tests cambia de un participante a otro, porque quien ya ha hecho un test de este tipo rinde mejor en el siguiente (efecto de la práctica). Con los tres tests hay 6 órdenes posibles: en el laboratorio se asignan por turnos según el número del código; online, al azar. Así cada test va el mismo número de veces en 1.º, 2.º y 3.er lugar. Se guarda el orden (`orden_bloques`) y la posición de cada test (`posicion_bloque`), de modo que la práctica se reparte por igual entre los tests y se puede estimar (`MR.SESION` en `config.js`).

Para crear una condición nueva, copia una de `MR.CONDICIONES` en `js/config.js` y cambia los valores. Para un cambio puntual hay un editor JSON en *Ajustes → Parámetros avanzados*. Si se modifica, la condición se guarda como `<clave>_personalizada`.

**Cómo se analiza el Estudio 2:** el test con distracción se compara con el test normal **de la misma persona** (diseño intra-sujeto), con el orden de los tests como factor entre sujetos. El control 2D se compara igual con el test normal (precisión, TR y pendiente). Para comparar con la IA, que no tiene práctica previa, conviene repetir el análisis del test normal y del 2D solo con quienes lo hicieron en primer lugar (en el panel hay un filtro para eso). Si se quiere además comparar pares con y sin distracción dentro del mismo test, basta con poner `distraccion.probabilidad` en 0,75: uno de cada cuatro pares irá sin distracción, repartidos por igual entre ángulos y tipos.

*Diseños anteriores:*
- Hasta el 18/11/2026: tres bloques (distractor sonoro, distractor visual y exposición breve de 3 s con las dos figuras a la vez), con distractores en la mitad de los pares que aparecían después de las figuras.
- Del 18 al 21/11: distracción y presentación secuencial, siempre después del Estudio 1.

Se cambiaron porque:
- se podía responder antes de que apareciera el distractor;
- la exposición breve y la secuencial no se pueden aplicar a la IA;
- el orden fijo confundía el efecto de cada test con el de la práctica;
- hacían la sesión más larga.

## 4. Parámetros principales (`js/config.js`)

| Parámetro | Por defecto | Qué hace |
|---|---|---|
| `semilla` | 20261117 | Misma semilla = mismas figuras y mismos pares para todo el mundo (humanos e IA). |
| `numFiguras` / `numFigurasPractica` | 8 / 2 | Figuras del test y figuras exclusivas de la práctica. |
| `cubosPorFigura`, `brazosPorFigura` | 10, 4 | Diseño de Shepard y Metzler. |
| `angulos` | [0, 50, 100, 150] | Ángulos de giro de la figura derecha. |
| `ejeRotacion` | `plano` | `plano`, `profundidad` o `aleatorio`. |
| `giroProfundidadFijo` | 15° | Pequeño giro en profundidad, para que los pares de 0° no sean copias exactas. |
| `ensayosPorCelda` | 6 | Pares por ángulo × tipo. Con 4 ángulos: 4 × 2 × 6 = 48. |
| `ordenFijo` | true | Todos ven el mismo orden (como neuropsych). Con `false`, cada participante tiene un orden aleatorio. |
| `limiteRespuestaMs` | null | null = sin límite. |
| `tiempoExposicionMs` | null | null = las figuras se ven hasta responder. |
| `presentacion` | `simultanea` | `secuencial`: primero la figura izquierda sola y luego la derecha sola. Tiempos en `secuencial` (`primeraMs` 2000, `mascaraMs` 300, `intervaloMs` 500, `segundaMs` 2000; `segundaMs: null` = hasta que responda). |
| `distraccion` | `activa: false` | Distracción continua: `sonido` y `imagen` (los dos sí), `probabilidad` (1 = todos los pares), `antesMs` [150, 400] (cuánto antes que las figuras empieza), `pitidoCadaMs` [350, 900], `formaCadaMs` [150, 400], `formaDuracionMs` 800, `volumen` 0,35. |
| `practica.soloPrimerBloque` | true | La práctica solo se hace en el primer bloque de la sesión. |
| `pausaCada` | 0 | Descanso cada N pares. |
| `tamanoFigura` | 320 px | Tamaño máximo; se reduce solo en pantallas pequeñas. |
| `mostrarResultadosAlParticipante` | true | Ponlo en false si no quieres que el participante vea su puntuación. |

## 5. Cómo se construyen las figuras (para la Metodología)

- Cada figura tiene **10 cubos unidos cara con cara en 4 brazos rectos**, con giros de 90° entre brazos. Cada brazo mide de 2 a 4 cubos y los extremos pueden ser de 1.
- Se descartan las figuras:
  - **planas**: tienen que usar las 3 direcciones del espacio;
  - **sin imagen en espejo distinta**, comprobado con las 24 rotaciones del cubo;
  - con **brazos que se tocan**;
  - **repetidas o demasiado parecidas**: cada figura difiere de las demás, y de sus espejos, en al menos 2 cubos tras la mejor superposición posible.
- Cada figura tiene una **vista de partida**: inclinación de 18–35° y acimut alejado de las vistas frontales. Se elige comprobando, con un render de identificadores, que **se ve al menos un 30 % de cada cubo**, tanto en la figura izquierda como en la derecha (igual y espejo).
- **Figura derecha** = (espejo horizontal si es par espejo) → giro fijo en profundidad de 15° → giro del ángulo indicado. En el giro en el plano, la iluminación gira con la imagen; si no, a 150° la figura parecería iluminada desde abajo, y eso sería una dificultad añadida que no es rotación.
- El sentido del giro (horario/antihorario) está equilibrado dentro de cada celda.
- Cada figura sale 6 veces y cada celda ángulo × tipo tiene 6 figuras distintas. El orden se baraja con dos restricciones: nunca la misma figura dos veces seguidas, y como máximo 3 pares seguidos del mismo tipo.
- Dibujo: proyección ortográfica, algoritmo del pintor, 3 tonos de verde azulado y aristas oscuras.
- Las **formas** dependen solo de la semilla y de los parámetros de forma, así que **todas las condiciones usan las mismas 10 figuras**.

## 6. Datos que se guardan (CSV, una fila por par)

Las columnas `angulo`, `tipo` (igual/espejo), `respuesta` (igual/espejo/vacío) y `tr_ms` son las que usa el script de análisis del Documento 2. Funciona directamente.

| Columna | Descripción |
|---|---|
| `sujeto`, `sesion`, `condicion` | Código del participante, identificador de la sesión y condición. |
| `bloque`, `ensayo` | `practica` o `test`, y número de orden. **Filtra `bloque == "test"` en el análisis.** |
| `figura`, `angulo`, `signo_giro`, `eje`, `tipo` | El estímulo. |
| `respuesta`, `acierto`, `tr_ms` | Respuesta, acierto (1/0, vacío si no hubo respuesta) y TR en ms desde que aparecen las figuras. |
| `sin_respuesta` | 1 si se agotó el límite de tiempo. |
| `medio_respuesta` | teclado / ratón / táctil. |
| `respondio_tras_ocultar` | Bloque secuencial: 1 si respondió con la segunda figura ya oculta. También vale para la exposición limitada. |
| `distractor_sonoro_programado`, `distractor_visual_programado` | 1 si el par llevaba distracción con sonido o con imagen. En el test con distracción, las dos valen 1 en todos los pares (en la práctica, 0). |
| `distractor_*`, `*_detalle`, `*_onset_ms` | Lo que se presentó de verdad. El detalle da el número de pitidos o de formas durante el par, por ejemplo «9 pitidos». El onset es el momento de inicio respecto a la aparición de las figuras: **negativo = empezó antes**. |
| `cambios_pestana` | Veces que el participante cambió de pestaña durante el par (control de calidad). |
| `visibilidad_min` | Fracción visible del cubo más tapado de la figura derecha. |
| `edad`, `genero`, `mano`, `estudios`, `vision`, `experiencia_3d`, `test_previo`, `dispositivo`, `pantalla` | Variables de control (cuestionario inicial). |
| `estrategia`, `dificultad`, `concentracion`, `fatiga` | Cuestionario final (1–5); se desactiva con `cuestionarioFinal: false`. |
| `modalidad` | `laboratorio` u `online`. |
| `sesion_completa`, `posicion_bloque`, `orden_bloques` | Sesión completa a la que pertenece el test, su posición en la sesión (1, 2…) y el orden de todos los tests de esa persona (por ejemplo, `distraccion>sin_limite`). |
| `tam_figura_px`, `orientacion` | Tamaño real de cada figura en pantalla y orientación (horizontal o vertical). En el móvil, las figuras son más pequeñas. |
| `sonido_comprobado` | `si` o `no` en la comprobación de sonido del bloque sonoro. |
| `practica_repetida` | 1 si hubo que repetir la práctica. Los pares de la repetición son los ensayos 5-8 de la práctica. |
| `interrupciones` | Solo online: «¿Te han interrumpido…?» (`no`, `alguna`, `bastantes`). |
| `origen` | Solo online: de qué enlace o grupo viene (`?origen=`). |
| `prueba` | 1 si son datos de prueba o de demostración, del laboratorio o de la versión online. **Hay que filtrarlos en el análisis.** |
| `presentacion`, `primera_ms`, `intervalo_ms`, `segunda_ms` | `simultanea` o `secuencial`. En la secuencial, cuánto se vio la primera figura, el intervalo entre las dos (máscara + vacío) y cuánto se vio la segunda. En la secuencial, `tr_ms` se mide desde que aparece la segunda figura. |

Las columnas nuevas están **al final**, así que el script de análisis sigue funcionando sin cambios.

Medidas de la pantalla final (mismas definiciones que neuropsych):

- **Precisión** = aciertos / respondidos.
- **Puntuación** = aciertos − errores.
- **Pendiente e intercepto**: regresión de la mediana de TR de aciertos en pares iguales frente al ángulo. Requiere al menos 2 aciertos en al menos 3 ángulos.

Precisión temporal: el TR se mide con el reloj de alta resolución del navegador, desde el fotograma en que aparecen las figuras. El error es de un fotograma (~16 ms), mucho menor que los efectos que se buscan.

## 7. Estímulos para modelos de IA (`estimulos.html`)

**Set del test.** Descarga un ZIP con:

- los 48 pares (+ 4 de práctica para few-shot) en el **mismo orden** que ven los humanos, como imagen de par y/o como figuras por separado;
- `manifiesto.csv` con la respuesta correcta. Los nombres de archivo no revelan la respuesta;
- `manifiesto.json` con las **coordenadas 3D de los cubos**, para probar una versión en texto;
- los prompts (`prompt_es.txt`, versión razonada, versión en inglés), con la misma consigna que leen los humanos.

**Dataset de entrenamiento.** Pares con figuras **nuevas**, 3D o 2D: se excluyen las 10 del test y sus espejos. Se puede elegir el número de pares, el tamaño, el eje de giro, el rango de ángulos y la variedad de figuras (8–12 cubos, 3–5 brazos). Solo se aceptan figuras que caben en el mismo marco que las del test, así que el cubo mide lo mismo en píxeles. Las figuras se reparten entre entrenamiento y validación, de modo que la validación usa figuras nunca vistas. `etiquetas.csv` lleva `y = 1` para espejo.

La red siamesa que se entrena con este dataset (IA-9) está en la carpeta [`../modelo_siames`](../modelo_siames/LEEME.md).

## 8. Ideas de experimentos adicionales

**Humanos**

- **Giro en el plano frente a en profundidad** (condición F). Shepard y Metzler encontraron pendientes parecidas. ¿Pasa lo mismo en los modelos?
- **Rango completo 0–180°** (condición G), para ver si el TR sigue siendo lineal hasta el máximo.
- **Doble tarea / carga de memoria de trabajo**: recordar 4–6 dígitos durante el bloque. Compite con la imagen mental, a diferencia de un distractor puntual.
- **Presión de tiempo** (límites de 3 s, 5 s o 7,5 s): intercambio velocidad-precisión.
- **Aprendizaje**: comparar la primera y la segunda mitad del test, o repetir el test otro día. La propia página avisa de un efecto de práctica fuerte.
- **Complejidad**: figuras de 6, 8, 10 o 12 cubos (`cubosPorFigura`).
- **Distractores estructurales** (figura distinta, no solo espejo), como en Vandenberg y Kuse.

**Modelos de IA**

- Modelos antiguos frente a nuevos, con y sin razonamiento: precisión por ángulo (¿cae con el ángulo como en humanos?) y tokens de razonamiento como variable auxiliar, no equivalente al TR.
- Zero-shot frente a few-shot (los 4 pares de práctica con su respuesta).
- **2D frente a 3D** (condición `control_2d`): si un modelo acierta con figuras planas y falla con las de cubos, el problema está en reconstruir la tridimensionalidad, no en el giro.
- **Imagen frente a texto**: dar las coordenadas 3D en lugar de la imagen. Si el modelo acierta con texto y falla con imagen, el problema es de percepción, no de razonamiento espacial.
- Par en una imagen frente a dos imágenes separadas; resolución de la imagen.
- **Modelo propio** entrenado con el dataset de entrenamiento: por ejemplo, una red siamesa con un codificador CNN compartido.
