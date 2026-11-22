# Versión online del test (para compartir por WhatsApp)

`participar.html` es el mismo test que el de laboratorio (mismas figuras, pares, orden y tiempos), preparado para que cualquiera lo haga solo, desde su móvil u ordenador, abriendo un enlace.

```
Enlace en WhatsApp ──► participar.html (GitHub Pages)
                          │  bienvenida → información y consentimiento → datos generales
                          │  práctica → test normal, test con distracción y control 2D, EN UN ORDEN AL AZAR → cuestionario → resultados
                          │
                          ├─ cada bloque terminado ──► Google Apps Script ──► hoja «ensayos»  (una fila por par)
                          └─ al final ──────────────► Google Apps Script ──► hoja «sesiones» (una fila por persona)
```

Si el envío automático falla, o no está configurado, al final la persona puede **mandar su archivo por WhatsApp** (botón «Enviar el archivo por WhatsApp…») o descargarlo.

> **Estado (21/11/2026): publicado y conectado.** Enlace: https://feduchyy.github.io/rotacion-mental/participar.html. Los datos van a la hoja de Google del grupo (pasos 1 a 3 hechos; falta el correo de `contacto`). Para publicar un cambio en el test: `powershell -ExecutionPolicy Bypass -File C:\datos_rotacion\publicar_test.ps1 "qué ha cambiado"` (el repositorio git está fuera de OneDrive, en `C:\datos_rotacion\web_rotacion_mental.git`).

---

## Paso 1. Crear la hoja que recibe los datos (unos 5 minutos, una sola vez)

1. Con la cuenta de Google del grupo, crea una hoja de cálculo nueva en Google Drive, por ejemplo «Rotación mental · datos online».
2. Menú **Extensiones → Apps Script**. Borra lo que haya y pega todo el contenido de [`recogida_datos.gs`](recogida_datos.gs). Guarda (icono del disquete).
3. Opcional, para comprobar que funciona: elige la función `probarEscritura` y pulsa **Ejecutar**. Google pedirá permisos:
   - «Revisar permisos» → elige la cuenta;
   - si sale «Google no ha verificado esta aplicación»: **Configuración avanzada → Ir a … (no seguro)**. Es normal: el script es vuestro;
   - **Permitir**.

   En la hoja aparecerá una pestaña `sesiones` con una fila `PRUEBA`; bórrala.
4. **Implementar → Nueva implementación**:
   - tipo (rueda dentada): **Aplicación web**;
   - Ejecutar como: **Yo**;
   - Quién tiene acceso: **Cualquier usuario**.

   **Implementar** y copia la **URL de la aplicación web** (acaba en `/exec`).
5. Comprobación: pega esa URL en el navegador. Debe aparecer `{"ok":true,"mensaje":"Servidor del test de rotación mental funcionando"}`.

> Si más adelante cambias el código del script, hay que hacer **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: nueva versión**. Así la URL no cambia.

## Paso 2. Configurar el test

En `js/config.js`, bloque `MR.ONLINE`:

| Campo | Qué poner |
|---|---|
| `urlEnvio` | La URL del paso 1 (`https://script.google.com/macros/s/…/exec`). |
| `enlacePublico` | La dirección pública de `participar.html`, una vez publicado (paso 3). Se usa en el botón «Compartir por WhatsApp». |
| `contacto` | **Recomendado:** un correo del grupo. Aparece en la información y sirve para que alguien pida que se borren sus datos. |
| `estudio2`, `control2D` | Qué partes se incluyen. Por defecto, los tres tests: normal, con distracción y control 2D (unos 11 min), en uno de los 6 órdenes posibles, al azar. |

## Paso 3. Publicar el test (gratis)

**GitHub Pages**, recomendado: la dirección es estable y usa https, que hace falta para compartir archivos y mantener la pantalla encendida en el móvil.

1. Crea una cuenta en github.com, si no la tenéis.
2. **New repository**: nombre, por ejemplo, `rotacion-mental`; **Public**; *Create repository*.
3. **uploading an existing file** → arrastra **todo el contenido** de la carpeta `test_rotacion_mental` (no la carpeta en sí: `index.html`, `participar.html`, `css/`, `js/`…) → *Commit changes*.
4. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → *Save*.
5. Espera 1-2 minutos. El test queda en `https://<usuario>.github.io/rotacion-mental/participar.html`.
6. Pon esa dirección en `enlacePublico` (paso 2). En `participar.html`, cambia `og:image` por `https://<usuario>.github.io/rotacion-mental/vista_previa.png`, para que WhatsApp muestre la imagen. Vuelve a subir los dos archivos.

Alternativa rápida: **Netlify Drop** (app.netlify.com/drop). Arrastras la carpeta y te da una dirección al momento; hay que crear una cuenta para que no caduque.

> El repositorio es público: cualquiera puede ver el código y la URL del script. Para un trabajo de clase no es un problema, porque el script solo añade filas y no deja leer los datos.

## Paso 4. Probar antes de compartir

- `participar.html?prueba=1`: test completo, con los datos marcados `prueba = 1`.
- `participar.html?corta=1`: demostración con 8 pares por bloque (unos 4 minutos), también marcada como prueba.

Comprueba en la hoja que llegan las filas a `ensayos` y `sesiones` y que en la pantalla final pone «✓ Tus respuestas han llegado». Hazlo al menos una vez **desde un móvil** (Android y iPhone, si podéis) y con el enlace abierto **desde WhatsApp**.

## Paso 5. Compartir por WhatsApp

Mensaje propuesto (también está en `MR.ONLINE.textoInvitacion`, que usa el botón de compartir del final):

> 🧠 ¿Cuánto tarda tu cerebro en girar una figura? Estamos haciendo un experimento para un trabajo de Neurociencia Cognitiva e IA (UFV) que compara a personas con inteligencias artificiales. Son unos 11 minutos, es anónimo y mejor desde el ordenador o con el móvil en horizontal y con sonido. 👉 https://…/participar.html ¡Gracias!

**Para saber de qué grupo viene cada participante**, añade `?origen=` al enlace (solo letras, números, `-` y `_`). Por ejemplo, `participar.html?origen=familia` o `participar.html?origen=clase_psico`. Queda en la columna `origen`.

**Versión corta** (solo el test normal del Estudio 1, unos 5 minutos): `participar.html?estudio=1`. Úsala si el grupo es poco paciente; mejor una versión corta completa que una larga a medias.

## Paso 6. Descargar y analizar los datos

En la hoja: **Archivo → Descargar → Valores separados por comas (.csv)**, una vez con la pestaña `ensayos` activa y otra con `sesiones`.

- **`ensayos`**: mismas columnas que el CSV del laboratorio, así que el script de análisis del Documento 2 funciona igual.
  - Filtra `bloque == "test"` y `prueba == 0`.
  - `modalidad` distingue `online` de `laboratorio`.
  - Las preguntas del cuestionario final no están aquí (se contestan al final); están en `sesiones`.
- **`sesiones`**: una fila por persona, con:
  - edad, género y el resto de datos generales;
  - el cuestionario final (estrategia, dificultad, concentración, cansancio e interrupciones);
  - dispositivo y orden de los tests (`orden_bloques`), que también va en cada fila de `ensayos` junto con la posición de cada test;
  - los descansos reales entre tests en segundos (`descansos_s`; el mínimo es de 10 s);
  - si completó todo (`estado`, `bloques`), duración y un resumen del test normal y del control 2D (precisión, TR mediano y pendiente).

  Se une con `ensayos` por `sujeto`.
- También se pueden arrastrar los CSV al **panel de resultados** (`panel.html`), que junta laboratorio, online e IA.

## Criterios de calidad propuestos para los datos online (decidir antes de analizar)

Fuera de un laboratorio no se controla el entorno. Propuesta de exclusiones, que hay que fijar de antemano y anotar en la memoria:

1. `prueba == 1` (ensayos del grupo).
2. Sesiones incompletas: para el Estudio 1 basta con que esté completo `sin_limite`.
3. Precisión en el Estudio 1 por debajo del 60 %: probablemente no entendió la tarea o respondió al azar (el azar es el 50 %).
4. Pares con TR < 300 ms (respuestas anticipadas) o > 20 s (interrupciones). Y, por participante, `cambios_pestana` alto o `interrupciones = bastantes`.
5. Analizar `modalidad` (laboratorio frente a online) y `dispositivo` (ordenador, móvil o tablet) como covariables. En móvil las figuras son más pequeñas (`tam_figura_px`) y se responde tocando, lo que alarga el TR.

**Sin sonido:** si la persona dice que no oye los pitidos, el test con distracción sigue **solo con las formas de colores**. Queda anotado en `sonido_comprobado = no`, en `ensayos` y en `sesiones`. Para el análisis de la distracción, conviene excluir a esas personas o analizarlas aparte. Con `MR.ONLINE.sinSonido = 'omitir'`, en cambio, ese test se salta.

## Protección de datos

- No se recoge nombre, correo, teléfono ni IP. El script no ve la IP de nadie.
- El código (`W…`) es aleatorio.
- La información y el consentimiento (con la casilla de mayoría de edad) se muestran antes de empezar.
- Si ponéis `contacto`, la gente puede pedir que se borren sus datos dando su código. Para borrarlos, buscad el código en las dos hojas.
- Hay un aviso para personas con epilepsia fotosensible, por el distractor visual que parpadea.
