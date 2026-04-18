"""
ViveSeguro MX — Endpoint /predict
Recibe condiciones del usuario y devuelve probabilidades por tipo de delito.
"""

import os
import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

router = APIRouter()

# ── Cargar modelo al iniciar la API ─────────────────────────────────────────
_BASE = os.path.dirname(__file__)
_MODEL_PATH    = os.path.join(_BASE, "../../model/model.joblib")
_ENCODER_PATH  = os.path.join(_BASE, "../../model/le_dominio.joblib")

try:
    MODEL_BUNDLE  = joblib.load(_MODEL_PATH)
    LE_DOMINIO    = joblib.load(_ENCODER_PATH)
    MODEL         = MODEL_BUNDLE["model"]
    FEATURE_COLS  = MODEL_BUNDLE["feature_cols"]
    DELITOS_MAP   = MODEL_BUNDLE["delitos_map"]
    Y_OFFSET      = MODEL_BUNDLE.get("y_offset", 1)
    print(f"✅ Modelo '{MODEL_BUNDLE['model_name']}' cargado correctamente.")
except FileNotFoundError:
    MODEL_BUNDLE = None
    MODEL = None
    print("⚠️  model.joblib no encontrado. Ejecuta scripts/colab_train.py primero.")


# ── Esquemas ─────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    sexo: int = Field(..., description="1 = Hombre, 2 = Mujer", ge=1, le=2)
    edad: int = Field(..., description="Edad en años", ge=1, le=110)
    entidad: int = Field(..., description="Clave de entidad federativa (1-32)", ge=1, le=32)
    municipio: int = Field(..., description="Clave de municipio", ge=1)
    clave_estado_municipio: float = Field(..., description="Clave combinada ej: 9.14")
    area_urbana: float = Field(..., description="Área urbana del catálogo ENVIPE")
    dominio: str = Field(..., description="'U'=Urbano  'C'=Complemento  'R'=Rural")
    estrato: int = Field(..., description="Estrato socioeconómico (1-4)", ge=1, le=4)
    mes: int = Field(..., description="Mes 1-12, 99=No especificado", ge=1)
    hora: int = Field(..., description="1=Madrugada 2=Mañana 3=Tarde 4=Noche 9=NS")
    lugar: int = Field(..., description="Lugar de ocurrencia (1-9)", ge=1, le=9)

class DelitoRiesgo(BaseModel):
    codigo: int
    delito: str
    probabilidad: float
    porcentaje: str

class PredictResponse(BaseModel):
    mensaje: str
    prediccion_principal: DelitoRiesgo
    top_5_riesgos: List[DelitoRiesgo]
    todos_los_riesgos: List[DelitoRiesgo]


# ── Endpoint principal ───────────────────────────────────────────────────────

@router.post("/predict", response_model=PredictResponse)
def predict(data: PredictRequest):
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Modelo no disponible.")

    # Codificar Dominio igual que en entrenamiento
    try:
        dominio_enc = int(LE_DOMINIO.transform([data.dominio.upper()])[0])
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Dominio inválido: '{data.dominio}'. Usa 'U', 'C' o 'R'."
        )

    # Construir DataFrame con el mismo orden de columnas que en entrenamiento
    row = pd.DataFrame([{
        "Sexo": data.sexo,
        "Edad": data.edad,
        "Entidad de ocurrencia del delito": data.entidad,
        "Municipio de ocurrencia del delito": data.municipio,
        "Clave_Estado_Municipio": data.clave_estado_municipio,
        "Área urbana de interés de ocurrencia del delito": data.area_urbana,
        "Dominio": dominio_enc,
        "Estrato sociodemográfico": data.estrato,
        "Mes de ocurrencia del delito": data.mes,
        "Hora aproximada de ocurrencia del delito": data.hora,
        "Lugar de ocurrencia del delito": data.lugar,
    }])[FEATURE_COLS]

    # Predicción con probabilidades
    probas  = MODEL.predict_proba(row)[0]
    classes = MODEL.classes_  # 0-14

    # Construir lista ordenada de mayor a menor probabilidad
    riesgos = []
    for clase_idx, prob in sorted(zip(classes, probas), key=lambda x: x[1], reverse=True):
        codigo = int(clase_idx) + Y_OFFSET          # convertir 0-index → 1-15
        nombre = DELITOS_MAP.get(codigo, f"Delito código {codigo}")
        riesgos.append(DelitoRiesgo(
            codigo=codigo,
            delito=nombre,
            probabilidad=round(float(prob), 4),
            porcentaje=f"{prob * 100:.1f}%",
        ))

    principal = riesgos[0]
    sexo_str  = "Hombre" if data.sexo == 1 else "Mujer"
    mensaje   = (
        f"Dadas tus condiciones actuales, tienes un {principal.porcentaje} de "
        f"probabilidad de ser víctima de: {principal.delito}."
    )

    return PredictResponse(
        mensaje=mensaje,
        prediccion_principal=principal,
        top_5_riesgos=riesgos[:5],
        todos_los_riesgos=riesgos,
    )


# ── Catálogos para el formulario del frontend ────────────────────────────────

@router.get("/catalogos")
def catalogos():
    """Devuelve todos los valores válidos para poblar el formulario."""
    return {
        "sexo":   {"1": "Hombre", "2": "Mujer"},
        "hora":   {
            "1": "Madrugada (00:01 – 06:00)",
            "2": "Mañana (06:01 – 12:00)",
            "3": "Tarde (12:01 – 18:00)",
            "4": "Noche (18:01 – 24:00)",
            "9": "No especificado",
        },
        "lugar":  {
            "1": "Calle o vía pública",
            "2": "Transporte público",
            "3": "Lugar de trabajo",
            "4": "Negocio o establecimiento comercial",
            "5": "Vehículo particular",
            "6": "Casa o domicilio",
            "7": "Baldío / descampado",
            "8": "Otro lugar",
            "9": "No especificado",
        },
        "dominio": {"U": "Urbano", "C": "Complemento urbano", "R": "Rural"},
        "estrato": {
            "1": "Estrato 1 — Muy bajo",
            "2": "Estrato 2 — Bajo",
            "3": "Estrato 3 — Medio",
            "4": "Estrato 4 — Alto",
        },
        "entidades": {
            "1":"Aguascalientes","2":"Baja California","3":"Baja California Sur",
            "4":"Campeche","5":"Coahuila","6":"Colima","7":"Chiapas","8":"Chihuahua",
            "9":"Ciudad de México","10":"Durango","11":"Guanajuato","12":"Guerrero",
            "13":"Hidalgo","14":"Jalisco","15":"Estado de México","16":"Michoacán",
            "17":"Morelos","18":"Nayarit","19":"Nuevo León","20":"Oaxaca",
            "21":"Puebla","22":"Querétaro","23":"Quintana Roo","24":"San Luis Potosí",
            "25":"Sinaloa","26":"Sonora","27":"Tabasco","28":"Tamaulipas",
            "29":"Tlaxcala","30":"Veracruz","31":"Yucatán","32":"Zacatecas",
        },
        "delitos": {str(k): v for k, v in {
            1:"Robo o asalto en calle o transporte público",
            2:"Robo en forma distinta a la anterior",
            3:"Fraude", 4:"Extorsión", 5:"Amenazas e intimidación",
            6:"Lesiones físicas", 7:"Secuestro o privación ilegal de la libertad",
            8:"Delitos sexuales", 9:"Robo parcial o total de vehículo",
            10:"Robo a casa habitación", 11:"Otros delitos",
            12:"Homicidio culposo", 13:"Corrupción de autoridades",
            14:"Robo en carretera", 15:"Otros delitos del fuero federal",
        }.items()},
    }
