import joblib
import os
import sys

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")

scaler = joblib.load(os.path.join(MODELS_DIR, "robust_scaler.pkl"))
print("Scaler stats:")
print("Center:", scaler.center_)
print("Scale:", scaler.scale_)

# Check one feature set from the first point in test_anomaly.py
import numpy as np
features = np.array([[0.07202206856191268, 0.0, 1.0, -0.9749279121818236, -0.22252093395631434, 1.0, 0.07202206856191268, 0.1, 1.0]])
print("Raw features:", features)
print("Scaled features:", scaler.transform(features))

if hasattr(scaler, "feature_names_in_"):
    print("Scaler features:", scaler.feature_names_in_)
else:
    print("Scaler features not available")

rf = joblib.load(os.path.join(MODELS_DIR, "random_forest.pkl"))
if hasattr(rf, 'feature_importances_'):
    print("RF Feature Importances:", rf.feature_importances_)
    print("Classes:", rf.classes_)
if hasattr(rf, "feature_names_in_"):
    print("RF features:", rf.feature_names_in_)
else:
    print("RF features not available")
