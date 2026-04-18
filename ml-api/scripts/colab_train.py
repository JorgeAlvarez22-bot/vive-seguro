# ============================================================
# ViveSeguro MX — Entrenamiento del modelo (Google Colab)
# Basado en ENVIPE 2025 — 39,503 registros, 15 clases de delitos
#
# INSTRUCCIONES:
# 1. Abre este archivo en Google Colab
# 2. Ejecuta cada celda en orden (Shift+Enter)
# 3. Al llegar a la celda de subida, sube: envipe_2025_modelo_limpio.csv
# 4. Al final se descargan automáticamente los archivos del modelo
# ============================================================

# ── CELDA 1: Instalar dependencias ──────────────────────────────────────────
import sys
IN_COLAB = 'google.colab' in sys.modules

if IN_COLAB:
    import subprocess
    subprocess.run(['pip', 'install', '-q', 'lightgbm', 'xgboost', 'imbalanced-learn'])

# ── CELDA 2: Imports ─────────────────────────────────────────────────────────
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
import joblib
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report

from imblearn.over_sampling import SMOTE

import xgboost as xgb
import lightgbm as lgb

print('✅ Imports correctos')

# ── CELDA 3: Subir CSV ───────────────────────────────────────────────────────
from google.colab import files
print("Sube el archivo: envipe_2025_modelo_limpio.csv")
uploaded = files.upload()
FILE_PATH = list(uploaded.keys())[0]
print(f"✅ Archivo subido: {FILE_PATH}")

# ── CELDA 4: Cargar datos ────────────────────────────────────────────────────
TARGET = 'Códigos para delitos'

DELITOS_MAP = {
    1:  "Robo o asalto en calle o transporte público",
    2:  "Robo en forma distinta a la anterior",
    3:  "Fraude",
    4:  "Extorsión",
    5:  "Amenazas e intimidación",
    6:  "Lesiones físicas",
    7:  "Secuestro o privación ilegal de la libertad",
    8:  "Delitos sexuales",
    9:  "Robo parcial o total de vehículo",
    10: "Robo a casa habitación",
    11: "Otros delitos",
    12: "Homicidio culposo",
    13: "Corrupción de autoridades",
    14: "Robo en carretera",
    15: "Otros delitos del fuero federal",
}

df = pd.read_csv(FILE_PATH)
print(f"✅ Dataset: {df.shape[0]:,} filas × {df.shape[1]} columnas")
print(df.head())

# ── CELDA 5: Preprocesamiento ────────────────────────────────────────────────
data = df.copy()
X = data.drop(columns=[TARGET])
y = data[TARGET].astype(int)

# Guardar nombres de columnas (importante para la API)
FEATURE_COLS = list(X.columns)
print("Features:", FEATURE_COLS)

# Encode Dominio (U/R/C → numérico)
le_dominio = LabelEncoder()
X['Dominio'] = le_dominio.fit_transform(X['Dominio'].astype(str))
print(f"Clases Dominio: {le_dominio.classes_}")

# Ajustar etiquetas a 0-index (1-15 → 0-14)
y_encoded = y - 1
print(f"Clases únicas: {sorted(y_encoded.unique())}")

# ── CELDA 6: Train/Test split + SMOTE ────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
)
print(f"Train: {X_train.shape} | Test: {X_test.shape}")

smote = SMOTE(random_state=42, k_neighbors=3)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
print(f"Train tras SMOTE: {X_train_res.shape}")

# ── CELDA 7: Entrenar los 3 modelos ──────────────────────────────────────────
print("\n🌲 Entrenando Random Forest...")
rf = RandomForestClassifier(
    n_estimators=300, max_depth=None, min_samples_leaf=2,
    class_weight='balanced', random_state=42, n_jobs=-1
)
rf.fit(X_train_res, y_train_res)
acc_rf = accuracy_score(y_test, rf.predict(X_test))
f1_rf  = f1_score(y_test, rf.predict(X_test), average='macro')
print(f"  Accuracy: {acc_rf:.4f} | F1-Macro: {f1_rf:.4f}")

print("\n⚡ Entrenando XGBoost...")
xgb_model = xgb.XGBClassifier(
    n_estimators=400, max_depth=6, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8,
    eval_metric='mlogloss', random_state=42, n_jobs=-1
)
xgb_model.fit(X_train_res, y_train_res, eval_set=[(X_test, y_test)], verbose=False)
acc_xgb = accuracy_score(y_test, xgb_model.predict(X_test))
f1_xgb  = f1_score(y_test, xgb_model.predict(X_test), average='macro')
print(f"  Accuracy: {acc_xgb:.4f} | F1-Macro: {f1_xgb:.4f}")

print("\n💡 Entrenando LightGBM...")
lgb_model = lgb.LGBMClassifier(
    n_estimators=400, max_depth=6, learning_rate=0.05, num_leaves=63,
    subsample=0.8, colsample_bytree=0.8, class_weight='balanced',
    random_state=42, n_jobs=-1, verbose=-1
)
lgb_model.fit(
    X_train_res, y_train_res,
    eval_set=[(X_test, y_test)],
    callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(period=-1)]
)
acc_lgb = accuracy_score(y_test, lgb_model.predict(X_test))
f1_lgb  = f1_score(y_test, lgb_model.predict(X_test), average='macro')
print(f"  Accuracy: {acc_lgb:.4f} | F1-Macro: {f1_lgb:.4f}")

# ── CELDA 8: Comparar y elegir el mejor ──────────────────────────────────────
results = pd.DataFrame({
    'Modelo'   : ['Random Forest', 'XGBoost', 'LightGBM'],
    'Accuracy' : [acc_rf,  acc_xgb,  acc_lgb],
    'F1-Macro' : [f1_rf,   f1_xgb,   f1_lgb],
    'Objeto'   : [rf, xgb_model, lgb_model],
})
results = results.sort_values('F1-Macro', ascending=False).reset_index(drop=True)
print("\n" + results[['Modelo','Accuracy','F1-Macro']].to_string(index=False))

best_row   = results.iloc[0]
best_model = best_row['Objeto']
best_name  = best_row['Modelo']
print(f"\n🏆 Mejor modelo: {best_name}")

# ── CELDA 9: Probar predicción con probabilidades ────────────────────────────
ejemplo = pd.DataFrame([{
    'Sexo': 2,
    'Edad': 25,
    'Entidad de ocurrencia del delito': 9,
    'Municipio de ocurrencia del delito': 14,
    'Clave_Estado_Municipio': 9.14,
    'Área urbana de interés de ocurrencia del delito': 14.0,
    'Dominio': le_dominio.transform(['U'])[0],
    'Estrato sociodemográfico': 3,
    'Mes de ocurrencia del delito': 6,
    'Hora aproximada de ocurrencia del delito': 3,
    'Lugar de ocurrencia del delito': 1,
}])

probas  = best_model.predict_proba(ejemplo)[0]
classes = best_model.classes_

print("\nPredicción (Mujer, 25 años, CDMX, tarde, calle pública):")
print("─" * 65)
for code_idx, prob in sorted(zip(classes, probas), key=lambda x: x[1], reverse=True):
    nombre = DELITOS_MAP.get(int(code_idx) + 1, f"Delito {code_idx+1}")
    bar = "█" * int(prob * 40)
    print(f"  {prob*100:5.1f}%  {bar}  {nombre}")

# ── CELDA 10: Guardar modelo y descargar ─────────────────────────────────────
# El bundle incluye TODO lo que necesita la API para hacer predicciones
model_bundle = {
    "model"         : best_model,
    "model_name"    : best_name,
    "feature_cols"  : FEATURE_COLS,        # orden exacto de columnas
    "delitos_map"   : DELITOS_MAP,         # código → nombre del delito
    "dominio_classes": list(le_dominio.classes_),  # ['C', 'R', 'U']
    "y_offset"      : 1,                   # las clases están en 0-14, sumar 1 = 1-15
}

joblib.dump(model_bundle, 'model.joblib')
joblib.dump(le_dominio,   'le_dominio.joblib')
print("✅ Archivos guardados")

# Descargar automáticamente
if IN_COLAB:
    files.download('model.joblib')
    files.download('le_dominio.joblib')
    print("\n✅ ¡Descarga iniciada!")
    print("📁 Coloca ambos archivos en:  ml-api/model/")
