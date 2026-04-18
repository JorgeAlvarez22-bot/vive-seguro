# 🛡️ ViveSeguro MX

Predictor de riesgo criminal basado en datos ENVIPE 2025.  
Ingresa tus condiciones (lugar, hora, sexo, entidad) y recibe porcentajes por tipo de delito.

---

## Estructura

```
vive-seguro/
├── ml-api/          ← API Python · deploy en Render
├── frontend/        ← App React  · deploy en Vercel
└── PRD.md           ← Documento de requerimientos (contexto para Cursor)
```

---

## Pasos para correr el proyecto

### 1. Entrenar el modelo en Google Colab

1. Abre [colab.research.google.com](https://colab.research.google.com)
2. Crea un nuevo notebook
3. Copia el contenido de `ml-api/scripts/colab_train.py` en celdas (una sección por celda)
4. Ejecuta celda por celda — sube `envipe_2025_modelo_limpio.csv` cuando se pida
5. Al terminar se descargan automáticamente:
   - `model.joblib`
   - `le_dominio.joblib`
6. **Coloca ambos archivos en `ml-api/model/`**

### 2. Subir datos a Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. En **Table Editor → New table**, nombra la tabla `envipe`
3. Importa el CSV `envipe_2025_modelo_limpio.csv`
4. Renombra la columna `Códigos para delitos` → `codigo_delito` (y los demás según el PRD)
5. En **Settings → API Keys**, copia `Project URL` y `anon public key`

> **Tip:** Puedes usar el SQL Editor de Supabase para renombrar columnas rápido:
> ```sql
> ALTER TABLE envipe RENAME COLUMN "Códigos para delitos" TO codigo_delito;
> ALTER TABLE envipe RENAME COLUMN "Sexo" TO sexo;
> ALTER TABLE envipe RENAME COLUMN "Edad" TO edad;
> ALTER TABLE envipe RENAME COLUMN "Entidad de ocurrencia del delito" TO entidad;
> ALTER TABLE envipe RENAME COLUMN "Municipio de ocurrencia del delito" TO municipio;
> ALTER TABLE envipe RENAME COLUMN "Clave_Estado_Municipio" TO clave_estado_municipio;
> ALTER TABLE envipe RENAME COLUMN "Área urbana de interés de ocurrencia del delito" TO area_urbana;
> ALTER TABLE envipe RENAME COLUMN "Dominio" TO dominio;
> ALTER TABLE envipe RENAME COLUMN "Estrato sociodemográfico" TO estrato;
> ALTER TABLE envipe RENAME COLUMN "Mes de ocurrencia del delito" TO mes;
> ALTER TABLE envipe RENAME COLUMN "Hora aproximada de ocurrencia del delito" TO hora;
> ALTER TABLE envipe RENAME COLUMN "Lugar de ocurrencia del delito" TO lugar;
> ```

### 3. Configurar variables de entorno del frontend

```bash
cd frontend
cp .env.example .env.local
```

Edita `.env.local`:
```
VITE_SUPABASE_URL=https://[tu-project-id].supabase.co
VITE_SUPABASE_KEY=[tu-anon-public-key]
VITE_ML_API_URL=https://[tu-servicio].onrender.com
VITE_APP_TITLE=ViveSeguro MX
```

### 4. Correr el frontend localmente

```bash
cd frontend
npm install
npm run dev
# Abre http://localhost:5173
```

### 5. Correr la API localmente (opcional)

```bash
cd ml-api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Abre http://localhost:8000/docs
```

---

## Deploy

### API → Render

1. Fork este repo en GitHub
2. En [render.com](https://render.com) → **New Web Service** → conecta el repo
3. Configura:
   - **Root Directory:** `ml-api`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
4. Deploy — copia la URL generada (ej: `https://vive-seguro-api.onrender.com`)

### Frontend → Vercel

1. En [vercel.com](https://vercel.com) → **New Project** → conecta el repo
2. Configura:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
3. Agrega las 3 variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_ML_API_URL`)
4. Deploy ✅

---

## Probar la API con Postman

**Health check:**
```
GET https://[tu-servicio].onrender.com/health
→ {"status":"ok","model_loaded":true}
```

**Predicción:**
```
POST https://[tu-servicio].onrender.com/predict
Content-Type: application/json

{
  "sexo": 2, "edad": 25, "entidad": 9, "municipio": 14,
  "clave_estado_municipio": 9.14, "area_urbana": 14.0,
  "dominio": "U", "estrato": 3, "mes": 6, "hora": 3, "lugar": 1
}
```

**Catálogos (para el frontend):**
```
GET https://[tu-servicio].onrender.com/catalogos
```
