import pandas as pd
import numpy as np
import math
import joblib
import os
from sklearn.preprocessing import RobustScaler
from sklearn.ensemble import IsolationForest, RandomForestClassifier, GradientBoostingClassifier

# Save to backend/models/anomaly/ — same path anomaly_predictor.py loads from
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models", "anomaly")
os.makedirs(MODELS_DIR, exist_ok=True)

# Generate synthetic normal data (similar to test_data.csv but longer)
np.random.seed(42)
n_samples = 1000

# Base normal usage: low at night, peak in morning/evening
def generate_kwh(hour):
    if 0 <= hour <= 5: return np.random.normal(0.15, 0.05)
    elif 6 <= hour <= 9: return np.random.normal(0.6, 0.15)
    elif 10 <= hour <= 17: return np.random.normal(0.2, 0.05)
    else: return np.random.normal(0.8, 0.2) # 18-23

data = []
for i in range(n_samples):
    hour = i % 24
    day = (i // 24) % 7
    kwh = max(generate_kwh(hour), 0.001)
    
    # Inject some anomalies (approx 5% of data)
    is_anomaly = 0
    if np.random.rand() < 0.05:
        kwh = kwh * np.random.uniform(3, 5) # spike
        is_anomaly = 1
        
    data.append({"kWh": kwh, "hour": hour, "day_of_week": day, "is_anomaly": is_anomaly})

df = pd.DataFrame(data)

# Compute rolling stats
df['rolling_mean'] = df['kWh'].rolling(window=24, min_periods=1).mean()
df['rolling_std'] = df['kWh'].rolling(window=24, min_periods=1).std().fillna(0.1).replace(0, 0.1)

# Engineer features
features = []
labels = []
for _, row in df.iterrows():
    h = row['hour']
    d = row['day_of_week']
    k = row['kWh']
    rm = row['rolling_mean']
    rs = row['rolling_std']
    
    features.append([
        k,
        math.sin(2 * math.pi * h / 24),
        math.cos(2 * math.pi * h / 24),
        math.sin(2 * math.pi * d / 7),
        math.cos(2 * math.pi * d / 7),
        1.0 if d >= 5 else 0.0,
        rm,
        rs,
        k / max(rm, 0.001)
    ])
    labels.append(int(row['is_anomaly']))

X = np.array(features)
y = np.array(labels)

# 1. Train Scaler
scaler = RobustScaler()
X_scaled = scaler.fit_transform(X)
joblib.dump(scaler, os.path.join(MODELS_DIR, "robust_scaler.pkl"))

# 2. Train Isolation Forest (unsupervised, only on normal data ideally, but we can fit on all)
iso_forest = IsolationForest(contamination=0.05, random_state=42)
iso_forest.fit(X_scaled)
joblib.dump(iso_forest, os.path.join(MODELS_DIR, "isolation_forest.pkl"))

# 3. Train Random Forest (supervised)
rf = RandomForestClassifier(n_estimators=50, random_state=42)
rf.fit(X_scaled, y)
joblib.dump(rf, os.path.join(MODELS_DIR, "random_forest.pkl"))

# 4. Train Gradient Boosting (supervised)
gb = GradientBoostingClassifier(n_estimators=50, random_state=42)
gb.fit(X_scaled, y)
joblib.dump(gb, os.path.join(MODELS_DIR, "gradient_boosting.pkl"))

print("Successfully trained and saved new models to:", MODELS_DIR)
