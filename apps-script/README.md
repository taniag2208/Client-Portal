# Endpoint de Google Sheets (Apps Script)

Este pequeño script conecta el portal con el Google Sheet de insumos para que los
cambios de **Estado** y **Observaciones** se escriban en tiempo real.

**Sheet destino:** [Simón Movilidad · Discovery · Insumos previos (Portal)](https://docs.google.com/spreadsheets/d/1OT9-RYit5ouEiPDGbzQDulvqguZwKguHi93eqqrtqXs/edit)
(ID `1OT9-RYit5ouEiPDGbzQDulvqguZwKguHi93eqqrtqXs`, ya creado con los 10 insumos precargados).

## Pasos para desplegar (5 min)

1. Ve a **[script.google.com](https://script.google.com)** con la cuenta de Tita
   (la misma dueña del Sheet) → **Nuevo proyecto**.
2. Borra el contenido y pega el código de [`Code.gs`](./Code.gs).
3. Guarda (💾). El `SHEET_ID` ya apunta al Sheet correcto.
4. **Implementar → Nueva implementación → Aplicación web**.
   - *Ejecutar como:* **Yo** (tu cuenta).
   - *Quién tiene acceso:* **Cualquier persona**.
   - Clic en **Implementar** y **autoriza** los permisos.
5. Copia la **URL de la aplicación web** (termina en `/exec`).
6. Pégala en [`assets/config.js`](../assets/config.js) en `APPS_SCRIPT_URL`
   y publica el portal. La insignia superior pasará de **"Modo local"** a
   **"Sheets · en vivo"**.

## Verificar

- Abre la URL `/exec` en el navegador → debe responder un JSON con los insumos
  (`doGet`).
- En el portal, cambia un Estado → la fila correspondiente del Sheet se actualiza
  y se llena la columna **"Última actualización (portal)"**.

## Notas

- El portal envía `Content-Type: text/plain` a propósito, para evitar el
  *preflight* CORS que Apps Script no maneja bien. El script hace el
  `JSON.parse` igual.
- Si renombras la pestaña del Sheet, ajusta `SHEET_NAME` en `Code.gs`.
- Sin endpoint configurado, el portal sigue funcionando en **modo local**
  (los cambios se guardan solo en el navegador de cada usuario).
