/* =====================================================================
 *  ZIP MÍNIMO (sin compresión, método "store")
 *  Suficiente para empaquetar PNG (que ya van comprimidos) y CSV/JSON.
 *  Uso: const zip = new MR.Zip(); zip.agregar('a/b.txt', 'hola');
 *       const blob = zip.generar();
 * ===================================================================== */
window.MR = window.MR || {};

MR.Zip = (function () {
  const TABLA = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    TABLA[n] = c >>> 0;
  }
  function crc32(datos) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < datos.length; i++) c = TABLA[(c ^ datos[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  const codificador = new TextEncoder();

  function Zip() { this.entradas = []; }
  Zip.prototype.agregar = function (nombre, contenido) {
    const datos = typeof contenido === 'string' ? codificador.encode(contenido) : new Uint8Array(contenido);
    this.entradas.push({ nombre: codificador.encode(nombre), datos, crc: crc32(datos) });
  };
  Zip.prototype.generar = function () {
    const partes = [], central = [];
    let desplazamiento = 0;
    const ahora = new Date();
    const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
    const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
    for (const e of this.entradas) {
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true); local.setUint16(10, hora, true); local.setUint16(12, fecha, true);
      local.setUint32(14, e.crc, true); local.setUint32(18, e.datos.length, true); local.setUint32(22, e.datos.length, true);
      local.setUint16(26, e.nombre.length, true); local.setUint16(28, 0, true);
      partes.push(local.buffer, e.nombre, e.datos);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, hora, true); cen.setUint16(14, fecha, true);
      cen.setUint32(16, e.crc, true); cen.setUint32(20, e.datos.length, true); cen.setUint32(24, e.datos.length, true);
      cen.setUint16(28, e.nombre.length, true); cen.setUint16(30, 0, true); cen.setUint16(32, 0, true);
      cen.setUint16(34, 0, true); cen.setUint16(36, 0, true); cen.setUint32(38, 0, true); cen.setUint32(42, desplazamiento, true);
      central.push(cen.buffer, e.nombre);
      desplazamiento += 30 + e.nombre.length + e.datos.length;
    }
    const tamCentral = central.reduce((s, p) => s + (p.byteLength || p.length), 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, this.entradas.length, true); fin.setUint16(10, this.entradas.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, desplazamiento, true);
    return new Blob([...partes, ...central, fin.buffer], { type: 'application/zip' });
  };
  return Zip;
})();
