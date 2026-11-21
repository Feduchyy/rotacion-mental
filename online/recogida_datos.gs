/**
 * RECOGIDA DE DATOS DEL TEST DE ROTACIÓN MENTAL (versión online)
 * ---------------------------------------------------------------
 * Pega este código en una hoja de cálculo de Google: Extensiones → Apps Script.
 * Después: Implementar → Nueva implementación → Aplicación web
 *   · Ejecutar como: Yo
 *   · Quién tiene acceso: Cualquier usuario
 * y copia la URL que acaba en /exec en js/config.js → MR.ONLINE.urlEnvio.
 * Instrucciones completas en online/INSTRUCCIONES_ONLINE.md.
 *
 * Crea y rellena tres hojas:
 *   ensayos  → una fila por par (mismas columnas que el CSV del laboratorio)
 *   sesiones → una fila por participante (datos generales, cuestionario final y resumen)
 *   control  → registro de envíos recibidos (para no duplicar y para confirmar la llegada)
 *
 * No ordenes ni borres filas de estas hojas mientras se recogen datos:
 * para analizar, descarga una copia (Archivo → Descargar → CSV) o duplica la hoja.
 */

var HOJA_ENSAYOS = 'ensayos';
var HOJA_SESIONES = 'sesiones';
var HOJA_CONTROL = 'control';
var MAX_FILAS_POR_ENVIO = 1000;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var datos = JSON.parse(e.postData.contents);
    if (!datos || !datos.clave_envio || !datos.tipo) return respuesta_({ ok: false, error: 'datos incompletos' });
    var libro = SpreadsheetApp.getActiveSpreadsheet();
    var control = hoja_(libro, HOJA_CONTROL, ['clave_envio', 'sesion_completa', 'sujeto', 'tipo', 'filas', 'recibido']);
    if (yaRecibido_(control, String(datos.clave_envio))) return respuesta_({ ok: true, repetido: true });

    var n = 0;
    if (datos.tipo === 'ensayos') {
      n = escribir_(libro, HOJA_ENSAYOS, datos.columnas, datos.filas);
    } else if (datos.tipo === 'sesion') {
      var cols = Object.keys(datos.fila || {});
      n = escribir_(libro, HOJA_SESIONES, cols, [cols.map(function (c) { return datos.fila[c]; })]);
    } else {
      return respuesta_({ ok: false, error: 'tipo desconocido' });
    }
    control.appendRow([String(datos.clave_envio), String(datos.sesion_completa || ''), String(datos.sujeto || ''), datos.tipo, n, new Date()]);
    return respuesta_({ ok: true, filas: n });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// GET: comprobación de que el servidor funciona y de qué envíos de una sesión han llegado (JSONP)
function doGet(e) {
  var p = (e && e.parameter) || {};
  var obj;
  if (p.accion === 'estado' && p.sesion_completa) {
    var control = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CONTROL);
    var recibidos = [];
    if (control && control.getLastRow() > 1) {
      var valores = control.getRange(2, 1, control.getLastRow() - 1, 2).getValues();
      for (var i = 0; i < valores.length; i++) {
        if (String(valores[i][1]) === String(p.sesion_completa)) recibidos.push(String(valores[i][0]));
      }
    }
    obj = { ok: true, recibidos: recibidos };
  } else {
    obj = { ok: true, mensaje: 'Servidor del test de rotación mental funcionando' };
  }
  var json = JSON.stringify(obj);
  if (p.callback && /^[A-Za-z_$][\w$]{0,60}$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function hoja_(libro, nombre, cabecera) {
  var h = libro.getSheetByName(nombre);
  if (!h) h = libro.insertSheet(nombre);
  if (h.getLastRow() === 0 && cabecera && cabecera.length) {
    h.getRange(1, 1, 1, cabecera.length).setValues([cabecera]).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}

// Escribe las filas colocando cada valor bajo su columna (por nombre). Si llegan columnas
// nuevas (otra versión del test), se añaden al final de la cabecera.
function escribir_(libro, nombre, columnas, filas) {
  if (!columnas || !columnas.length || !filas || !filas.length) return 0;
  if (filas.length > MAX_FILAS_POR_ENVIO) throw new Error('demasiadas filas en un envío');
  var h = hoja_(libro, nombre, columnas);
  var cab = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].map(String);
  var nuevas = columnas.filter(function (c) { return cab.indexOf(String(c)) < 0; });
  if (nuevas.length) {
    h.getRange(1, cab.length + 1, 1, nuevas.length).setValues([nuevas]).setFontWeight('bold');
    cab = cab.concat(nuevas.map(String));
  }
  var pos = {};
  columnas.forEach(function (c, i) { pos[String(c)] = i; });
  var salida = filas.map(function (f) {
    return cab.map(function (c) {
      var i = pos[c];
      var v = (i === undefined) ? '' : f[i];
      return (v === null || v === undefined) ? '' : String(v);
    });
  });
  var rango = h.getRange(h.getLastRow() + 1, 1, salida.length, cab.length);
  rango.setNumberFormat('@'); // todo como texto: sin conversiones de fechas ni decimales con coma
  rango.setValues(salida);
  return salida.length;
}

function yaRecibido_(control, clave) {
  if (control.getLastRow() < 2) return false;
  var celda = control.getRange(2, 1, control.getLastRow() - 1, 1).createTextFinder(clave).matchEntireCell(true).findNext();
  return celda !== null;
}

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Para comprobar desde el editor (botón «Ejecutar») que el script puede escribir en la hoja.
// Crea filas de prueba con sujeto PRUEBA: bórralas después.
function probarEscritura() {
  var e = { postData: { contents: JSON.stringify({
    tipo: 'sesion', clave_envio: 'PRUEBA_' + Date.now(), sesion_completa: 'PRUEBA', sujeto: 'PRUEBA',
    fila: { sujeto: 'PRUEBA', sesion_completa: 'PRUEBA', prueba: 1, nota: 'fila de prueba, se puede borrar' }
  }) } };
  Logger.log(doPost(e).getContent());
}
