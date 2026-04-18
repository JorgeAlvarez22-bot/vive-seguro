# PRD — ViveSeguro MX
## Predictor de Riesgo Criminal · ENVIPE 2025

---

## 1. Visión del Producto

**Problema:** En México, las personas se desplazan sin conocer su nivel de riesgo ante el crimen según su contexto (lugar, hora, zona).

**Usuario objetivo:** Ciudadano mexicano que quiere saber a qué delitos es más propenso dadas sus condiciones actuales.

**Propuesta de valor:** ViveSeguro MX recibe datos del contexto del usuario y predice — con porcentajes explícitos por cada tipo de delito — su nivel de riesgo, usando datos reales del ENVIPE 2025 (39,503 registros, 15 categorías de delitos).

Ejemplo de output:
> "Dadas tus condiciones actuales, tienes un 23.4% de probabilidad de ser víctima de: Amenazas e intimidación."

---

## 2. Identidad Visual

- **Nombre:** ViveSeguro MX · Tagline: "Conoce tu riesgo. Actúa con información."
- **Colores:**
  - Primary: `#1A237E` · Primary light: `#3949AB`
  - Danger: `#D32F2F` · Warning: `#F57C00` · Safe: `#2E7D32`
  - Background: `#F5F5F5` · Card: `#FFFFFF` · Border: `#E0E0E0`
- **Font:** Inter (Google Fonts)

---

## 3. Stack Técnico

| Capa | Tecnología | Plataforma |
|------|-----------|-----------|
| Frontend | React 18 + Vite + Recharts | Vercel |
| Base de datos | Supabase (PostgreSQL) | Supabase |
| ML API | FastAPI + scikit-learn / XGBoost / LightGBM | Render |
| Modelo | Random Forest / XGBoost / LightGBM + SMOTE | Entrenado en Colab |
| Dataset | ENVIPE 2025 — 39,503 registros, 15 clases | — |

---

## 4. Estructura del Proyecto

```
vive-seguro/
├── ml-api/                   ← API de Python
│   ├── app/main.py
│   ├── app/routes/predict.py
│   ├── model/                ← model.joblib + le_dominio.joblib (generados en Colab)
│   ├── scripts/colab_train.py
│   └── requirements.txt
├── frontend/                 ← App React
│   ├── src/pages/Dashboard.jsx
│   ├── src/pages/Explorador.jsx
│   ├── src/pages/Predictor.jsx   ← PANTALLA PRINCIPAL
│   ├── src/hooks/useSupabase.js
│   ├── src/hooks/useMLPredict.js
│   └── src/utils/catalogos.js
└── PRD.md
```

---

## 5. Páginas

### Dashboard (`/`)
- 4 KPI cards: Total victimizaciones · Delito más frecuente · Hora de mayor riesgo · Lugar de mayor riesgo
- Gráfica barras horizontal: Top 10 delitos
- Gráfica pie: distribución por hora
- Gráfica barras agrupadas: top 5 delitos por sexo
- Gráfica pie: distribución hombre/mujer

### Explorador (`/explorador`)
- Filtros: Sexo, Entidad, Hora, Lugar, Tipo de delito
- Tabla paginada (10 filas): Sexo, Edad, Entidad, Hora, Lugar, Delito
- Botón exportar CSV con filtros activos
- Contador "Mostrando X de N registros"

### Predictor (`/predictor`) ⭐ Principal
- **Formulario (izq):** Sexo (pills) · Edad · Entidad (select) · Zona (pills) · Estrato · Hora (pills con íconos) · Lugar · Mes
- **Panel resultado (der):**
  - Estado vacío: ícono escudo + instrucciones
  - Estado cargando: spinner
  - Con resultado: badge color (Rojo >35% / Naranja 20-35% / Verde <20%) + % grande + nombre delito + mensaje personalizado
  - Barras: Top 5 riesgos con barras de color
  - Toggle: Ver todos los 15 delitos
  - Historial: últimas 3 consultas de la sesión

---

## 6. Contratos de API

### Supabase — tabla `envipe`
```
Columnas: sexo, edad, entidad, municipio, clave_estado_municipio,
          area_urbana, dominio, estrato, mes, hora, lugar, codigo_delito
```

### ML API — POST /predict
```json
Request:
{
  "sexo": 2, "edad": 25, "entidad": 9, "municipio": 14,
  "clave_estado_municipio": 9.14, "area_urbana": 14.0,
  "dominio": "U", "estrato": 3, "mes": 6, "hora": 3, "lugar": 1
}

Response:
{
  "mensaje": "Dadas tus condiciones...",
  "prediccion_principal": { "codigo": 5, "delito": "Amenazas e intimidación", "probabilidad": 0.234, "porcentaje": "23.4%" },
  "top_5_riesgos": [...],
  "todos_los_riesgos": [...]
}
```

### ML API — GET /catalogos
Devuelve todos los valores válidos para poblar los selects del formulario.

---

## 7. Checklist

### Configuración
- [ ] Ejecutar `colab_train.py` en Google Colab → descargar `model.joblib` + `le_dominio.joblib`
- [ ] Colocar ambos archivos en `ml-api/model/`
- [ ] Subir CSV a Supabase como tabla `envipe` (con columna `codigo_delito`)
- [ ] Fork del repo en GitHub
- [ ] Copiar `frontend/.env.example` → `.env.local` y llenar valores

### Deploy
- [ ] Deploy de `ml-api/` en Render (Build: `pip install -r requirements.txt` · Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
- [ ] Deploy de `frontend/` en Vercel (Root: `frontend` · Framework: Vite)
- [ ] Variables de entorno en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_ML_API_URL`

### QA
- [ ] GET /health devuelve `{"status":"ok","model_loaded":true}`
- [ ] POST /predict devuelve 15 delitos con porcentajes que suman ~100%
- [ ] Dashboard carga con datos reales de Supabase
- [ ] Predictor muestra resultado con colores correctos
- [ ] App funciona desde celular (responsive)
