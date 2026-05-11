"""
ViveSeguro MX — Endpoint /predict
"""

import os
import joblib
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

router = APIRouter()

_BASE = os.path.dirname(__file__)
_MODEL_PATH   = os.path.join(_BASE, "../../model/model.joblib")
_ENCODER_PATH = os.path.join(_BASE, "../../model/le_dominio.joblib")

# Nombres actualizados — sobreescriben los del modelo
DELITOS_MAP = {
    1:  "Asalto en vía pública o transporte",
    2:  "Robo sin violencia (carterismo, etc.)",
    3:  "Fraude o engaño económico",
    4:  "Extorsión o cobro de piso",
    5:  "Amenazas o intimidación personal",
    6:  "Agresión física o golpes",
    7:  "Secuestro o retención ilegal",
    8:  "Acoso o agresión sexual",
    9:  "Robo de vehículo o autopartes",
    10: "Robo a domicilio",
    11: "Vandalismo, daño a propiedad o delitos menores",
    12: "Homicidio por accidente o negligencia",
    13: "Corrupción o abuso de autoridad",
    14: "Asalto en carretera",
    15: "Delitos federales (narcóticos, tráfico, etc.)",
}

try:
    MODEL_BUNDLE = joblib.load(_MODEL_PATH)
    LE_DOMINIO   = joblib.load(_ENCODER_PATH)
    MODEL        = MODEL_BUNDLE["model"]
    FEATURE_COLS = MODEL_BUNDLE["feature_cols"]
    Y_OFFSET     = MODEL_BUNDLE.get("y_offset", 1)
    print(f"Modelo '{MODEL_BUNDLE['model_name']}' cargado correctamente.")
except FileNotFoundError:
    MODEL_BUNDLE = None
    MODEL = None
    print("model.joblib no encontrado.")


class PredictRequest(BaseModel):
    sexo: int = Field(..., ge=1, le=2)
    edad: int = Field(..., ge=1, le=110)
    entidad: int = Field(..., ge=1, le=32)
    municipio: int = Field(..., ge=1)
    clave_estado_municipio: float
    area_urbana: float
    dominio: str
    estrato: int = Field(..., ge=1, le=4)
    mes: int = Field(..., ge=1)
    hora: int
    lugar: int = Field(..., ge=1, le=9)

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


@router.post("/predict", response_model=PredictResponse)
def predict(data: PredictRequest):
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Modelo no disponible.")

    try:
        dominio_enc = int(LE_DOMINIO.transform([data.dominio.upper()])[0])
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Dominio invalido: '{data.dominio}'.")

    row = np.array([[
        data.sexo, data.edad, data.entidad, data.municipio,
        data.clave_estado_municipio, data.area_urbana, dominio_enc,
        data.estrato, data.mes, data.hora, data.lugar,
    ]], dtype=float)

    probas  = MODEL.predict_proba(row)[0]
    classes = MODEL.classes_

    riesgos = []
    for clase_idx, prob in sorted(zip(classes, probas), key=lambda x: x[1], reverse=True):
        codigo = int(clase_idx) + Y_OFFSET
        nombre = DELITOS_MAP.get(codigo, f"Delito {codigo}")
        riesgos.append(DelitoRiesgo(
            codigo=codigo,
            delito=nombre,
            probabilidad=round(float(prob), 4),
            porcentaje=f"{prob * 100:.1f}%",
        ))

    principal = riesgos[0]
    mensaje = f"Segun tu perfil, el delito mas probable es: {principal.delito}."

    return PredictResponse(
        mensaje=mensaje,
        prediccion_principal=principal,
        top_5_riesgos=riesgos[:5],
        todos_los_riesgos=riesgos,
    )


@router.get("/catalogos")
def catalogos():
    return {
        "delitos": {str(k): v for k, v in DELITOS_MAP.items()},
    }
