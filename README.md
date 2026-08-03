# Client Portal · Simón Movilidad

Portal de **Discovery** para Simón Movilidad, réplica del client portal de Tita Media
adaptada a este cliente. Consolida en una sola interfaz web:

- **Insumos previos** — checklist de los 10 insumos solicitados a Simón, cuyos
  cambios de estado se **escriben en un Google Sheet** compartido en tiempo real.
- **Preguntas Discovery** — la batería de preguntas por bloque, filtrada a las que
  están **abiertas** (`○`) o requieren **profundizar** (`◑`). Las preguntas ya
  resueltas en el kickoff (`✔ respondida · confirmar`) quedan fuera.

Fuente de datos: `Matriz_Discovery_Simon_Movilidad_Sesion2.xlsx`.

## Contenido

- **72 preguntas activas** (56 abiertas + 16 por profundizar) en **14 bloques**.
- **10 insumos previos** con estado editable → Google Sheet.

```
Client-Portal/
├── index.html            # portal (una sola página, sin build)
├── assets/
│   ├── config.js         # URL del endpoint de Sheets + ID del Sheet
│   ├── data.js           # datos extraídos de la matriz (auto-generado)
│   ├── styles.css
│   └── app.js
└── apps-script/
    ├── Code.gs           # endpoint que escribe al Google Sheet
    └── README.md         # cómo desplegarlo (5 min)
```

## Cómo usarlo

**Local:** abre `index.html` en el navegador (o `python3 -m http.server`).
Funciona de inmediato en **modo local** — los cambios de insumos se guardan en el
navegador.

**Con Google Sheets en vivo:** sigue [`apps-script/README.md`](apps-script/README.md)
para desplegar el endpoint y pega su URL en `assets/config.js`. La insignia superior
pasará a **"Sheets · en vivo"** y cada cambio se registrará en el
[Google Sheet de insumos](https://docs.google.com/spreadsheets/d/1OT9-RYit5ouEiPDGbzQDulvqguZwKguHi93eqqrtqXs/edit).

## Regenerar los datos

Si cambia la matriz, exporta el `.xlsx` y regenera `assets/data.js`. El filtro
mantiene solo las preguntas con `Estado` = `○ ABIERTA` o `◑ PARCIAL · profundizar`,
agrupadas por el bloque limpio (`_Bloque` / `_Sub-bloque`).

---

Tita Media · Metodología CRO + Método Científico · 2026
