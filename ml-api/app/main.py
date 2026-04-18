from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.predict import router as predict_router

app = FastAPI(
    title="ViveSeguro MX — API de Predicción Criminal",
    description="Predice el tipo de crimen al que eres más propenso basándose en datos ENVIPE 2025.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)

@app.get("/")
def root():
    return {"app": "ViveSeguro MX", "version": "1.0.0", "docs": "/docs"}

@app.get("/health")
def health():
    from app.routes.predict import MODEL_BUNDLE
    return {"status": "ok", "model_loaded": MODEL_BUNDLE is not None}
