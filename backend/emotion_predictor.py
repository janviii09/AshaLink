"""
emotion_predictor.py
Loads the pre-trained GoEmotions models and classifies text into 28 emotions.

GoEmotions is Google's dataset of 58k Reddit comments labeled with 27 emotions + neutral.
The models here were trained on this dataset using TF-IDF + various classifiers.

Models loaded:
- TF-IDF Vectorizer (vocab=25,000) — converts text to numerical features
- MultiLabelBinarizer (28 classes) — encodes/decodes emotion labels
- OvR Logistic Regression — multi-label classification
- OvR Linear SVM — multi-label classification  
- OvR Naive Bayes — multi-label classification
- OvR Random Forest — multi-label classification
- Macro Classifier — 6-class macro sentiment (positive/negative/neutral/surprise/curiosity/other)

The 28 emotions:
  admiration, amusement, anger, annoyance, approval, caring, confusion,
  curiosity, desire, disappointment, disapproval, disgust, embarrassment,
  excitement, fear, gratitude, grief, joy, love, nervousness, optimism,
  pride, realization, relief, remorse, sadness, surprise, neutral
"""

import os
import pickle
import joblib
import numpy as np
import warnings

warnings.filterwarnings("ignore")

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "saved_models_goemotion")

# Emotions grouped for elderly care relevance
ELDERLY_CARE_GROUPS = {
    "positive": ["admiration", "amusement", "approval", "caring", "excitement", "gratitude", "joy", "love", "optimism", "pride", "relief"],
    "negative": ["anger", "annoyance", "disappointment", "disapproval", "disgust", "embarrassment", "grief", "remorse", "sadness"],
    "concerning": ["fear", "nervousness", "grief", "sadness", "remorse", "disgust"],
    "neutral": ["neutral", "realization", "surprise", "confusion", "curiosity", "desire"],
}


class EmotionPredictor:
    """Multi-label emotion classification using GoEmotions-trained models."""

    def __init__(self):
        print("  Loading GoEmotions models...")
        self.tfidf = joblib.load(os.path.join(MODELS_DIR, "tfidf_vectorizer.pkl"))
        self.mlb = joblib.load(os.path.join(MODELS_DIR, "multilabel_binarizer.pkl"))
        self.macro_clf = joblib.load(os.path.join(MODELS_DIR, "macro_classifier_best.pkl"))

        # Load emotion names
        with open(os.path.join(MODELS_DIR, "emotion_names.pkl"), "rb") as f:
            self.emotion_names = pickle.load(f)

        # Load all OvR classifiers
        self.classifiers = {}
        for name in ["ovr_logistic_regression", "ovr_svm_linearsvc", "ovr_naive_bayes", "ovr_random_forest"]:
            try:
                self.classifiers[name] = joblib.load(os.path.join(MODELS_DIR, f"{name}.pkl"))
            except Exception as e:
                print(f"  ⚠️ Could not load {name}: {e}")

        print(f"  ✅ GoEmotions loaded: {len(self.classifiers)} classifiers, {len(self.emotion_names)} emotions")

    def predict(self, text: str, model: str = "ovr_logistic_regression") -> dict:
        """
        Classify text into emotions.

        Parameters:
            text: the message to classify
            model: which classifier to use (default: logistic regression)

        Returns dict with primary emotion, score, all emotions, and elderly care assessment.
        """
        if model not in self.classifiers:
            model = list(self.classifiers.keys())[0]

        clf = self.classifiers[model]

        # Transform text to TF-IDF features
        X = self.tfidf.transform([text])

        # Multi-label prediction
        pred = clf.predict(X)
        pred_labels = self.mlb.inverse_transform(pred)
        # inverse_transform returns integer indices (0-27), map to emotion names
        detected_indices = list(pred_labels[0]) if pred_labels[0] else []
        detected_emotions = [self.emotion_names[int(idx)] for idx in detected_indices] if detected_indices else ["neutral"]

        # Get probability/confidence scores for all 28 emotions
        emotion_scores = {}
        try:
            # Some classifiers support predict_proba
            probas = clf.predict_proba(X)[0]
            for i, emotion in enumerate(self.emotion_names):
                emotion_scores[emotion] = round(float(probas[i]), 4)
        except Exception:
            # Fallback: use decision_function or binary labels
            try:
                decision = clf.decision_function(X)[0]
                for i, emotion in enumerate(self.emotion_names):
                    # Sigmoid to convert decision function to 0-1 range
                    score = 1.0 / (1.0 + np.exp(-float(decision[i])))
                    emotion_scores[emotion] = round(score, 4)
            except Exception:
                # Last resort: binary from prediction
                for i, emotion in enumerate(self.emotion_names):
                    emotion_scores[emotion] = 1.0 if emotion in detected_emotions else 0.0

        # Sort by score descending
        sorted_emotions = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)
        primary_emotion = str(sorted_emotions[0][0]) if sorted_emotions else "neutral"
        top_5 = sorted_emotions[:5]

        # Macro classification (positive/negative/neutral/surprise/curiosity/other)
        macro_pred = str(self.macro_clf.predict(X)[0])
        try:
            macro_proba = self.macro_clf.predict_proba(X)[0]
            macro_scores = {str(cls): round(float(p), 4) for cls, p in zip(self.macro_clf.classes_, macro_proba)}
        except Exception:
            macro_scores = {macro_pred: 1.0}

        # Compute a simple 1-10 well-being score
        positive_score = sum(float(emotion_scores.get(e, 0)) for e in ELDERLY_CARE_GROUPS["positive"])
        negative_score = sum(float(emotion_scores.get(e, 0)) for e in ELDERLY_CARE_GROUPS["negative"])
        concerning_score = sum(float(emotion_scores.get(e, 0)) for e in ELDERLY_CARE_GROUPS["concerning"])

        # Normalize to 1-10 scale
        total = positive_score + negative_score + 0.001
        well_being_score = round(max(1.0, min(10.0, (positive_score / total) * 9 + 1)), 1)

        # Elderly care assessment
        care_concerns = []
        for emotion in detected_emotions:
            if emotion in ELDERLY_CARE_GROUPS.get("concerning", []):
                care_concerns.append(str(emotion))

        return {
            "primary_emotion": primary_emotion,
            "detected_emotions": detected_emotions,
            "well_being_score": float(well_being_score),
            "top_emotions": [{"emotion": str(e), "score": float(s)} for e, s in top_5],
            "all_emotions": {str(k): float(v) for k, v in emotion_scores.items()},
            "macro_sentiment": {
                "label": macro_pred,
                "scores": macro_scores,
            },
            "elderly_care": {
                "positive_total": round(float(positive_score), 4),
                "negative_total": round(float(negative_score), 4),
                "concerning_total": round(float(concerning_score), 4),
                "care_concerns": care_concerns,
                "needs_attention": bool(well_being_score < 4 or len(care_concerns) > 0),
            },
            "model_used": model,
        }

    def predict_all_models(self, text: str) -> dict:
        """Run prediction with all available classifiers for comparison."""
        results = {}
        for model_name in self.classifiers:
            results[model_name] = self.predict(text, model=model_name)
        return results
