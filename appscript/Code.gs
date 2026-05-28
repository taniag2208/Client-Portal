// ============================================================
// Portal TechnoFood × Tita Media — Google Apps Script Backend
// ============================================================
// INSTRUCCIONES DE DESPLIEGUE:
//   1. Abre script.google.com → Nuevo proyecto
//   2. Pega este código en Code.gs
//   3. Menú → Implementar → Nueva implementación
//      - Tipo: App web
//      - Ejecutar como: Yo (tu cuenta Google)
//      - Quién tiene acceso: Cualquier persona
//   4. Copia la URL de implementación
//   5. Pégala en index.html como valor de WEBHOOK
// ============================================================

const DRIVE_FOLDER_ID = "1OnyMdyysidFvkv_0QMthuD0HR_NooWV4";
const SPREADSHEET_NAME = "TechnoFood · Insumos Portal";

// ── Autorización inicial ──────────────────────────────────────
// Ejecuta esta función UNA VEZ desde el editor de Apps Script
// para autorizar el acceso a Drive y Sheets antes de usar el portal.
function setup() {
  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  Logger.log("✅ Carpeta de Drive encontrada: " + folder.getName());
  var ss = getSpreadsheet();
  Logger.log("✅ Spreadsheet lista: " + ss.getName() + " — " + ss.getUrl());
  Logger.log("✅ Setup completo. El portal puede enviar datos.");
}

// ── Entry point ───────────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Portal TechnoFood · Apps Script activo" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result = { success: false, error: "Sin datos" };
  try {
    // Accept URL-encoded form POST (e.parameter.data) or raw text POST (e.postData.contents)
    var raw = (e.parameter && e.parameter.data)
           || (e.postData && e.postData.contents);
    if (!raw) throw new Error("No se recibieron datos en el POST");
    var payload = JSON.parse(raw);
    Logger.log("doPost recibido — action: " + payload.action + " | usuario: " + payload.usuario);
    if (payload.action === "submit_texts") {
      result = handleTexts(payload);
    } else if (payload.action === "upload_file") {
      result = handleFileUpload(payload);
    } else {
      result = { success: false, error: "Acción desconocida: " + payload.action };
    }
  } catch (err) {
    Logger.log("doPost ERROR: " + err.toString());
    result = { success: false, error: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Spreadsheet helpers ───────────────────────────────────────
function getSpreadsheet() {
  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var files = folder.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  // Create the spreadsheet inside the Drive folder
  var ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  return ss;
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#f0f0ed");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ── Handler: text / confirm items → Sheets ────────────────────
function handleTexts(payload) {
  var ss = getSpreadsheet();

  // --- Sheet "Respuestas" ---
  var sheet = getOrCreateSheet(ss, "Respuestas", [
    "Timestamp", "Empresa", "Usuario",
    "Avance Total", "Obligatorios",
    "Bloque", "Item ID", "Etiqueta",
    "Tipo", "Entregado", "Valor"
  ]);

  var timestamp = new Date();
  payload.items.forEach(function (item) {
    if (item.tipo !== "archivo") {
      sheet.appendRow([
        timestamp,
        payload.empresa,
        payload.usuario,
        payload.avance,
        payload.obligatorios,
        item.bloque,
        item.id,
        item.label,
        item.tipo,
        item.entregado,
        item.valor
      ]);
    }
  });

  // --- Sheet "Resumen" ---
  refreshSummary(ss, payload);

  return { success: true };
}

// ── Handler: file upload → Drive ──────────────────────────────
function handleFileUpload(payload) {
  var rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  // Folder structure: TechnoFood / Bloque / Item
  var empresaFolder = getOrCreateFolder(rootFolder, payload.empresa || "TechnoFood");
  var bloqueFolder  = getOrCreateFolder(empresaFolder, payload.bloque);
  var itemName      = sanitizeName(payload.itemId + " · " + payload.itemLabel);
  var itemFolder    = getOrCreateFolder(bloqueFolder, itemName);

  // Decode base64 → Blob → Drive file
  var bytes = Utilities.base64Decode(payload.base64Data);
  var blob  = Utilities.newBlob(bytes, payload.mimeType || "application/octet-stream", payload.fileName);
  var file  = itemFolder.createFile(blob);

  // Log in "Archivos" sheet
  var ss    = getSpreadsheet();
  var sheet = getOrCreateSheet(ss, "Archivos", [
    "Timestamp", "Empresa", "Usuario",
    "Bloque", "Item ID", "Etiqueta",
    "Nombre Archivo", "Tipo MIME",
    "Tamaño (KB)", "URL en Drive"
  ]);

  sheet.appendRow([
    new Date(),
    payload.empresa,
    payload.usuario,
    payload.bloque,
    payload.itemId,
    payload.itemLabel,
    payload.fileName,
    payload.mimeType,
    Math.round((payload.fileSize || 0) / 1024),
    file.getUrl()
  ]);

  return { success: true, fileId: file.getId(), fileUrl: file.getUrl() };
}

// ── Summary sheet ─────────────────────────────────────────────
function refreshSummary(ss, payload) {
  var sheet = ss.getSheetByName("Resumen") || ss.insertSheet("Resumen", 0);
  sheet.clearContents();
  var rows = [
    ["Campo", "Valor"],
    ["Última actualización", new Date()],
    ["Empresa", payload.empresa],
    ["Usuario", payload.usuario],
    ["Avance total", payload.avance],
    ["Obligatorios completados", payload.obligatorios],
  ];
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#f0f0ed");
  sheet.setFrozenRows(1);
}

// ── Drive folder helpers ──────────────────────────────────────
function getOrCreateFolder(parent, name) {
  var safe = sanitizeName(name);
  var folders = parent.getFoldersByName(safe);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(safe);
}

function sanitizeName(name) {
  // Remove characters invalid in Drive folder/file names and trim to 100 chars
  return (name || "sin-nombre")
    .replace(/[\/\\:*?"<>|]/g, "_")
    .substring(0, 100)
    .trim();
}
