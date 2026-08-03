// ============================================================================
//  CONFIGURACIÓN DEL PORTAL
// ============================================================================
//  1. Despliega el Apps Script de /apps-script/Code.gs como Web App
//     (ver /apps-script/README.md).
//  2. Pega aquí la URL del Web App (.../exec) para activar la escritura
//     de los insumos al Google Sheet en tiempo real.
//  Si lo dejas vacío, el portal funciona en modo local (los cambios se
//  guardan solo en este navegador y NO se envían al Sheet).
// ============================================================================
window.PORTAL_CONFIG = {
  // Pega la URL del Web App de Apps Script (termina en /exec)
  APPS_SCRIPT_URL: "",

  // ID del Google Sheet destino (ya creado con los insumos precargados)
  SHEET_ID: "1OT9-RYit5ouEiPDGbzQDulvqguZwKguHi93eqqrtqXs",
};
