/**
 * Simón Movilidad · Client Portal — endpoint de escritura a Google Sheets
 * -----------------------------------------------------------------------
 * Recibe las actualizaciones de insumos desde el portal (fetch POST) y las
 * escribe en la hoja "Insumos previos" del Google Sheet.
 *
 * Despliegue: ver apps-script/README.md
 */

// ID del Google Sheet destino (ya creado con los insumos precargados).
var SHEET_ID = '1OT9-RYit5ouEiPDGbzQDulvqguZwKguHi93eqqrtqXs';

// Nombre de la pestaña. Al convertir el CSV, Google la nombra "Sheet1".
// Ajusta si renombras la pestaña.
var SHEET_NAME = '';

// Columnas (1-indexed) según el encabezado del Sheet.
var COL = { NUM: 1, INSUMO: 2, ESTADO: 7, OBS: 8, UPDATED: 9 };

function _sheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET → devuelve el estado actual de los insumos (útil para verificar). */
function doGet() {
  try {
    var sh = _sheet();
    var values = sh.getDataRange().getValues();
    var rows = values.slice(1).map(function (r) {
      return {
        num: r[COL.NUM - 1],
        insumo: r[COL.INSUMO - 1],
        estado: r[COL.ESTADO - 1],
        observaciones: r[COL.OBS - 1],
        updatedAt: r[COL.UPDATED - 1],
      };
    });
    return _json({ ok: true, count: rows.length, rows: rows });
  } catch (e) {
    return _json({ ok: false, error: String(e) });
  }
}

/** POST → actualiza un insumo por número. */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (body.action !== 'updateInsumo') {
      return _json({ ok: false, error: 'Acción no soportada: ' + body.action });
    }

    var sh = _sheet();
    var data = sh.getDataRange().getValues();
    var targetRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][COL.NUM - 1]) === String(body.num)) {
        targetRow = i + 1; // 1-indexed
        break;
      }
    }
    if (targetRow === -1) {
      return _json({ ok: false, error: 'Insumo no encontrado: ' + body.num });
    }

    if (body.estado != null) sh.getRange(targetRow, COL.ESTADO).setValue(body.estado);
    if (body.observaciones != null) sh.getRange(targetRow, COL.OBS).setValue(body.observaciones);
    var stamp = body.updatedAt ? new Date(body.updatedAt) : new Date();
    sh.getRange(targetRow, COL.UPDATED).setValue(stamp);

    return _json({ ok: true, row: targetRow, num: body.num });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}
