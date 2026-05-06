"""
anomaly_predictor.py
Loads the pre-trained electricity anomaly detection models and provides predictions.

Models loaded:
- Isolation Forest (unsupervised) — learns what "normal" looks like, flags outliers
- Random Forest (supervised) — classifies readings as normal/anomaly
- Gradient Boosting (supervised) — ensemble classifier for anomaly detection
- RobustScaler — normalizes features before feeding to models

All models expect 9 features (matching the training pipeline):
  [kWh, hour_sin, hour_cos, day_sin, day_cos, is_weekend,
   rolling_mean_24h, rolling_std_24h, kWh_ratio]
"""

import os
import joblib
import numpy as np
import math
import warnings

warnings.filterwarnings("ignore")

# Path to saved models directory (relative to this file's parent)
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saved_models")


class AnomalyPredictor:
    """Wraps multiple anomaly detection models for electricity usage."""

    def __init__(self):
        print("  Loading anomaly detection models...")
        self.scaler = joblib.load(os.path.join(MODELS_DIR, "robust_scaler.pkl"))
        self.isolation_forest = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.pkl"))
        self.random_forest = joblib.load(os.path.join(MODELS_DIR, "random_forest.pkl"))
        self.gradient_boosting = joblib.load(os.path.join(MODELS_DIR, "gradient_boosting.pkl"))
        print(f"  ✅ All anomaly models loaded (features={self.scaler.n_features_in_})")

    def _engineer_features(
        self,
        kWh: float,
        hour: int,
        day_of_week: int = 2,
        rolling_mean: float = None,
        rolling_std: float = None,
    ) -> np.ndarray:
        """
        Engineer the 9 features expected by the trained models.

        Parameters:
            kWh: electricity consumption in kilowatt-hours
            hour: hour of day (0-23)
            day_of_week: 0=Monday, 6=Sunday
            rolling_mean: 24-hour rolling mean (if available)
            rolling_std: 24-hour rolling standard deviation (if available)
        """
        # Cyclical encoding of hour (preserves proximity: 23h is close to 0h)
        hour_sin = math.sin(2 * math.pi * hour / 24)
        hour_cos = math.cos(2 * math.pi * hour / 24)

        # Cyclical encoding of day of week
        day_sin = math.sin(2 * math.pi * day_of_week / 7)
        day_cos = math.cos(2 * math.pi * day_of_week / 7)

        # Weekend flag
        is_weekend = 1.0 if day_of_week >= 5 else 0.0

        # If no rolling stats provided, use reasonable defaults
        if rolling_mean is None:
            rolling_mean = kWh  # fallback: current value
        if rolling_std is None:
            rolling_std = 0.1  # fallback: small std

        # Ratio of current to rolling mean (avoids division by zero)
        kWh_ratio = kWh / max(rolling_mean, 0.001)

        features = np.array([[
            kWh,
            hour_sin,
            hour_cos,
            day_sin,
            day_cos,
            is_weekend,
            rolling_mean,
            rolling_std,
            kWh_ratio,
        ]])

        return features

    def predict(
        self,
        kWh: float,
        hour: int,
        day_of_week: int = 2,
        rolling_mean: float = None,
        rolling_std: float = None,
    ) -> dict:
        """
        Run all anomaly detection models on a single electricity reading.

        Returns a dict with predictions from each model and an ensemble verdict.
        """
        raw_features = self._engineer_features(kWh, hour, day_of_week, rolling_mean, rolling_std)
        scaled_features = self.scaler.transform(raw_features)

        # --- Isolation Forest ---
        # predict: 1 = normal, -1 = anomaly
        # decision_function: negative = anomaly, positive = normal
        if_pred = int(self.isolation_forest.predict(scaled_features)[0])
        if_score = float(self.isolation_forest.decision_function(scaled_features)[0])
        if_is_anomaly = if_pred == -1

        # --- Random Forest ---
        # predict: 0 = normal, 1 = anomaly
        rf_pred = int(self.random_forest.predict(scaled_features)[0])
        rf_proba = self.random_forest.predict_proba(scaled_features)[0]
        rf_confidence = float(max(rf_proba))
        rf_is_anomaly = rf_pred == 1

        # --- Gradient Boosting ---
        gb_pred = int(self.gradient_boosting.predict(scaled_features)[0])
        gb_proba = self.gradient_boosting.predict_proba(scaled_features)[0]
        gb_confidence = float(max(gb_proba))
        gb_is_anomaly = gb_pred == 1

        # --- Ensemble: majority vote ---
        votes = [if_is_anomaly, rf_is_anomaly, gb_is_anomaly]
        ensemble_anomaly = sum(votes) >= 2  # 2 out of 3 agree

        # Average confidence (for normal/anomaly)
        avg_confidence = (
            (1.0 if if_is_anomaly else 0.0)
            + (rf_proba[1] if len(rf_proba) > 1 else 0.0)
            + (gb_proba[1] if len(gb_proba) > 1 else 0.0)
        ) / 3.0

        return {
            "is_anomaly": ensemble_anomaly,
            "confidence": round(1.0 - avg_confidence if not ensemble_anomaly else avg_confidence, 4),
            "models": {
                "isolation_forest": {
                    "is_anomaly": if_is_anomaly,
                    "anomaly_score": round(if_score, 4),
                },
                "random_forest": {
                    "is_anomaly": rf_is_anomaly,
                    "confidence": round(rf_confidence, 4),
                    "anomaly_probability": round(float(rf_proba[1]) if len(rf_proba) > 1 else 0.0, 4),
                },
                "gradient_boosting": {
                    "is_anomaly": gb_is_anomaly,
                    "confidence": round(gb_confidence, 4),
                    "anomaly_probability": round(float(gb_proba[1]) if len(gb_proba) > 1 else 0.0, 4),
                },
            },
            "ensemble_votes": {
                "anomaly_votes": sum(votes),
                "normal_votes": 3 - sum(votes),
            },
            "input": {
                "kWh": kWh,
                "hour": hour,
                "day_of_week": day_of_week,
            },
        }

    def predict_batch(self, readings) -> list:
        """Predict anomalies for multiple readings at once."""
        return [
            self.predict(
                kWh=r["kWh"],
                hour=r["hour"],
                day_of_week=r.get("day_of_week", 2),
                rolling_mean=r.get("rolling_mean"),
                rolling_std=r.get("rolling_std"),
            )
            for r in readings
        ]
