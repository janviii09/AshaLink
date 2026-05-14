# 🔗 AshaLink — AI-Powered Elderly Care Platform (2026 Edition)

An advanced, real-time elderly care companion built with **Next.js 16**, featuring **LiveAvatar WebRTC video streaming**, **ML Ensemble anomaly detection**, **RAG-powered intelligence**, and **privacy-first medical monitoring**.

---

## 🌟 2026 Key Innovations

### 🎭 LiveAvatar 2026 — WebRTC Video Companion
- **Real-time Video Interaction**: Replaced legacy SDKs with a direct **WebRTC / LiveKit** implementation for ultra-low latency (<500ms) video streaming.
- **Lip-Sync Precision**: Integrated **ElevenLabs Multilingual v2** directly into the video stream for perfect mouth-movement synchronization.
- **Zero-Failure Voice Fallback**: Implemented a "Fail-Safe" logic that automatically switches from high-end ElevenLabs AI to the **Browser Web Speech API** if API limits or network issues occur.
- **Bilingual Excellence**: Optimized for **Hindi (Aditi Voice)** and English, ensuring cultural comfort for Indian elderly users.

### 🧠 Gemini 1.5 Flash Intelligence & RAG
- **Core Intelligence**: Powered by **Google Gemini 1.5 Flash** across all modules (RAG, Sentiment, OCR).
- **Counseling RAG**: Context-aware companion trained on **5,700+ counseling transcripts**.
- **Medical Safety Shield**: Proactive refusal of medication advice with empathetic pivots to **elderly-safe yoga (Anulom Vilom, Bhramari)**.
- **Smart SOS Crisis Detection**: Real-time message scanning for suicide ideation, medical emergencies, or severe distress with automated Twilio escalation.

### 📊 ML Ensemble Activity Monitoring (NILM)
- **Advanced Anomaly Detection**: Moved beyond basic Z-scores to a **Triple-Model ML Ensemble**:
  1. **Isolation Forest**: Detects structural outliers in routine.
  2. **Random Forest**: Classifies usage patterns against 14-day historical windows.
  3. **Gradient Boosting**: Predicts expected usage and flags deviations.
- **14-Day Realistic Dataset**: Pre-seeded high-fidelity electricity data for a professional presentation.

### 💊 Intelligent Medication Management
- **Local OCR (WASM)**: In-browser medicine scanning via **Tesseract.js** (Zero data leaves the device).
- **Vision AI**: Cloud-based secondary identification via **Gemini 1.5 Flash Vision**.
- **Compliance Tracking**: Real-time monitoring of medication adherence with caregiver notifications.

---

## 👨‍👩‍👧 Caregiver Dashboard (The Control Center)
- **Mood Trend Analysis**: 7-day visualization of the user's emotional state using hybrid sentiment scoring.
- **Activity Anomalies**: Color-coded bar charts showing routine deviations detected by the ML models.
- **Health Keyword Alerts**: Scans transcripts for **8 health categories** (Pain, Memory, Sleep, etc.) entirely in-browser.
- **Emergency Management**: Manage contacts, trigger Twilio SOS calls, and track live GPS locations.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | High-performance React framework |
| **Video/RTC** | **LiveKit / WebRTC** | Real-time low-latency video streaming |
| **AI (LLM)** | **Google Gemini 1.5 Flash** | Core intelligence, RAG, and Vision |
| **AI (Voice)** | **ElevenLabs Multilingual v2** | Professional Hindi/English speech |
| **ML Engine** | **Scikit-Learn (Python uvicorn)** | Ensemble anomaly detection models |
| **Charts** | Recharts | Advanced data visualization |
| **SOS** | Twilio API | Voice calls, SMS, and TwiML Hindi audio |
| **OCR** | Tesseract.js | In-browser privacy-first text extraction |

---

## 🚀 Installation & Setup

### 1. Environment Configuration
Create a `.env.local` file with the following keys:

```env
# Gemini Intelligence
GEMINI_API_KEY=your_google_ai_key

# Voice & Video
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key
HEYGEN_API_KEY=your_liveavatar_key

# SOS Systems
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

### 2. Launch
```bash
# Install frontend dependencies
npm install

# Start the frontend
npm run dev

# Start the ML Backend (in /backend folder)
python3 -m uvicorn main:app --port 8000
```

---

## 📁 Key Algorithms

### 1. The ML Ensemble (NILM)
Uses a voting mechanism between **Isolation Forest**, **RF**, and **GBM** to minimize false positives in activity monitoring. It analyzes 24-hour cycles to differentiate between a "late wake-up" and a "potential medical fall."

### 2. Empathy-First RAG
Utilizes **Cosine Similarity** to retrieve counseling examples, which are then passed to Gemini 1.5 Flash to generate responses that are patient, simple, and culturally respectful (avoiding clinical terms).

### 3. Haversine Community Map
Calculates real-world distances between the elderly user and verified volunteers for immediate grocery or medical assistance requests.

---

## 📄 License
Private Project. All rights reserved. Built with ❤️ for AshaLink.
