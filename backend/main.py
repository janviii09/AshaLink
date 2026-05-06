"""
ApkaSaathi ML Backend — FastAPI Server

This server loads pre-trained ML models and exposes prediction endpoints
that the Next.js frontend calls for:

1. Electricity anomaly detection (Isolation Forest, Random Forest, Gradient Boosting)
2. Emotion classification from text (GoEmotions: 28 emotions, 4 classifiers)

Run with:
    cd backend && uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import time

# ── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ApkaSaathi ML Backend",
    description="Pre-trained model inference for anomaly detection and emotion classification",
    version="1.0.0",
)

# Allow Next.js (localhost:3000) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load Models at Startup ───────────────────────────────────────────────────

print("\n🧠 Loading ML models...")
start = time.time()

from anomaly_predictor import AnomalyPredictor
from emotion_predictor import EmotionPredictor

anomaly_model = AnomalyPredictor()
emotion_model = EmotionPredictor()

print(f"✅ All models loaded in {time.time() - start:.1f}s\n")

# ── Request / Response Schemas ───────────────────────────────────────────────


class AnomalyRequest(BaseModel):
    """Single electricity reading to check for anomalies."""
    kWh: float = Field(..., description="Electricity consumption in kilowatt-hours")
    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    day_of_week: int = Field(default=2, ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")
    rolling_mean: Optional[float] = Field(default=None, description="24h rolling mean kWh")
    rolling_std: Optional[float] = Field(default=None, description="24h rolling std dev")


class AnomalyBatchRequest(BaseModel):
    """Multiple readings for batch anomaly detection."""
    readings: List[AnomalyRequest]


class EmotionRequest(BaseModel):
    """Text to analyze for emotions."""
    text: str = Field(..., min_length=1, description="Text message to classify")
    model: str = Field(default="ovr_logistic_regression", description="Classifier to use")


class EmotionCompareRequest(BaseModel):
    """Text to analyze with all models for comparison."""
    text: str = Field(..., min_length=1)


# ── Endpoints ────────────────────────────────────────────────────────────────


@app.get("/")
def root():
    """Health check and model info."""
    return {
        "status": "running",
        "models": {
            "anomaly_detection": {
                "models": ["isolation_forest", "random_forest", "gradient_boosting"],
                "features": 9,
                "method": "ensemble (majority vote)",
            },
            "emotion_classification": {
                "models": list(emotion_model.classifiers.keys()),
                "emotions": len(emotion_model.emotion_names),
                "dataset": "GoEmotions (Google, 58k labeled texts)",
            },
        },
    }


@app.post("/predict/anomaly")
def predict_anomaly(req: AnomalyRequest):
    """
    Predict whether a single electricity reading is anomalous.

    Uses an ensemble of 3 models:
    - Isolation Forest (unsupervised)
    - Random Forest (supervised)
    - Gradient Boosting (supervised)

    The ensemble uses majority voting (2/3 must agree = anomaly).
    """
    try:
        result = anomaly_model.predict(
            kWh=req.kWh,
            hour=req.hour,
            day_of_week=req.day_of_week,
            rolling_mean=req.rolling_mean,
            rolling_std=req.rolling_std,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/anomaly/batch")
def predict_anomaly_batch(req: AnomalyBatchRequest):
    """Predict anomalies for multiple readings at once."""
    try:
        readings = [r.model_dump() for r in req.readings]
        results = anomaly_model.predict_batch(readings)
        anomaly_count = sum(1 for r in results if r["is_anomaly"])
        return {
            "total": len(results),
            "anomalies": anomaly_count,
            "normal": len(results) - anomaly_count,
            "predictions": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/emotion")
def predict_emotion(req: EmotionRequest):
    """
    Classify text into 28 emotions using GoEmotions-trained models.

    Returns:
    - Primary emotion and detected emotions
    - Well-being score (1-10)
    - Top 5 emotions with confidence scores
    - Macro sentiment (positive/negative/neutral)
    - Elderly care assessment (concerns, attention needed)
    """
    try:
        result = emotion_model.predict(text=req.text, model=req.model)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/emotion/compare")
def predict_emotion_compare(req: EmotionCompareRequest):
    """Run all emotion classifiers on the same text for comparison."""
    try:
        results = emotion_model.predict_all_models(text=req.text)
        return {
            "text": req.text,
            "models": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models/emotions")
def list_emotions():
    """List all 28 emotion labels and their groupings."""
    return {
        "emotions": emotion_model.emotion_names,
        "groups": {
            "positive": ["admiration", "amusement", "approval", "caring", "excitement", "gratitude", "joy", "love", "optimism", "pride", "relief"],
            "negative": ["anger", "annoyance", "disappointment", "disapproval", "disgust", "embarrassment", "grief", "remorse", "sadness"],
            "concerning": ["fear", "nervousness", "grief", "sadness", "remorse", "disgust"],
            "neutral": ["neutral", "realization", "surprise", "confusion", "curiosity", "desire"],
        },
    }
