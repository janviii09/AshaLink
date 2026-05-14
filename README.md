<p align="center">
  <img src="public/elderly-saathi.png" alt="AshaLink Logo" width="140" style="border-radius: 50%;" />
</p>

<h1 align="center">AshaLink — AI-Powered Elderly Care Platform</h1>

<p align="center">
  <em>Privacy-first, culturally aware companion for elderly safety, mental wellness & emergency response</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Scikit--Learn-ML_Ensemble-F7931E?logo=scikit-learn&logoColor=white" alt="Scikit-Learn" />
  <img src="https://img.shields.io/badge/Twilio-SOS-F22F46?logo=twilio&logoColor=white" alt="Twilio" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Core Modules](#-core-modules)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Key Algorithms](#-key-algorithms)
- [API Reference](#-api-reference)
- [Team](#-team)

---

## 🔍 Overview

**AshaLink** is a full-stack elderly care platform that combines real-time activity monitoring, an empathetic AI companion, crisis detection, and community support — all designed with **privacy-first principles** and **cultural sensitivity** for Indian elderly users.

### What Makes It Different

| Feature | Traditional Apps | AshaLink |
|---------|-----------------|----------|
| Activity Monitoring | Basic alerts | **Triple-model ML ensemble** (IF + RF + GB) with adaptive Z-score fallback |
| Companion AI | Generic chatbot | **RAG pipeline** over 5,700 counseling transcripts + Gemini 2.5 Flash |
| Crisis Detection | Manual SOS button | **Real-time NLP scanning** (50+ bilingual keywords) with auto Twilio dispatch |
| Medicine Tracking | Cloud upload | **In-browser OCR** (Tesseract.js WASM) — zero data leaves the device |
| Sentiment Analysis | Single-score | **Hybrid model**: AI scoring + 7 elderly-specific concern pattern detectors |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                            │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────────────┐   │
│  │ Landing  │ │ Dashboard │ │Companion │ │  Client-Side ML    │   │
│  │  Pages   │ │ (Recharts)│ │(Voice+AI)│ │  Z-Score, OCR,     │   │
│  │          │ │           │ │          │ │  Haversine, NLP    │   │
│  └──────────┘ └─────┬─────┘ └────┬─────┘ └────────────────────┘   │
│                     │            │                                  │
└─────────────────────┼────────────┼──────────────────────────────────┘
                      │  fetch()   │
┌─────────────────────┼────────────┼──────────────────────────────────┐
│              NEXT.JS API ROUTES (Node.js Server)                   │
│  ┌─────────┐ ┌──────┐ ┌─────┐ ┌────────┐ ┌─────┐ ┌────────────┐  │
│  │rag-chat │ │ sos  │ │ tts │ │sentimnt│ │ml-  │ │medicine-   │  │
│  │         │ │      │ │     │ │        │ │anom.│ │identify/rag│  │
│  └────┬────┘ └──┬───┘ └──┬──┘ └───┬────┘ └──┬──┘ └─────┬──────┘  │
└───────┼─────────┼────────┼───────┼──────────┼──────────┼──────────┘
        │         │        │       │          │          │
   ┌────▼───┐ ┌───▼──┐ ┌──▼───┐ ┌─▼──┐  ┌───▼────┐ ┌──▼───┐
   │ Gemini │ │Twilio│ │Eleven│ │Gem. │  │ Python │ │ Groq │
   │2.5Flash│ │Voice │ │Labs  │ │2.5F │  │FastAPI │ │Vision│
   │  +RAG  │ │ +SMS │ │ TTS  │ │     │  │:8000   │ │+LLM  │
   └────────┘ └──────┘ └──────┘ └────┘  └────────┘ └──────┘
                                         │
                                  ┌──────▼──────┐
                                  │  ML Models  │
                                  │ (.pkl files) │
                                  │ IF, RF, GB  │
                                  │ GoEmotions  │
                                  └─────────────┘
```

---

## 🧩 Core Modules

### 1. 🧠 AI Companion (Saathi)
> Voice + text-based mental health companion

- **RAG Pipeline**: TF-IDF keyword retrieval over **5,700 counseling transcripts** → top-5 context injection → Gemini 2.5 Flash generation
- **Voice Interface**: Browser Web Speech API (STT) → RAG → ElevenLabs Hindi TTS (`eleven_multilingual_v2`)
- **LiveAvatar**: WebRTC video streaming via LiveKit for lip-synced avatar interaction
- **Fallback Chain**: ElevenLabs TTS → Browser `SpeechSynthesis` (zero-downtime guarantee)

### 2. 📊 Activity Monitoring (NILM)
> Electricity-based non-intrusive life monitoring

- **Dual-Mode Detection**:
  - **Statistical (Client)**: Z-score anomaly flagging (`|Z| > 2`, ~95% confidence) with per-hour adaptive thresholds
  - **ML Ensemble (Server)**: 3-model majority vote — Isolation Forest + Random Forest + Gradient Boosting
- **9 Engineered Features**: kWh, cyclical hour/day encoding (sin/cos), is_weekend, rolling stats, deviation ratio
- **Visualization**: Recharts AreaChart with anomaly overlay + learned thresholds table

### 3. 🆘 Crisis Detection & SOS
> Multi-tier real-time safety system

- **NLP Scanner**: 50+ keywords across 3 severity levels (Critical / High / Moderate) in English + Hindi
- **Auto-Dispatch**: Critical → Twilio voice calls (Hindi TwiML, Amazon Polly Aditi) + SMS with GPS coordinates
- **Smart Escalation**: Sentiment score override (forces 0.5–1.5/10 for crisis keywords) + caregiver SMS alerts

### 4. 💊 Medicine Management
> Privacy-first medication tracking

- **In-Browser OCR**: Tesseract.js (C++ WASM) — medicine label scanning with **zero cloud upload**
- **Dosage Extraction**: Regex `/\d+(?:\.\d+)?\s*(mg|ml|mcg|g)/i` parses strength from OCR output
- **Medicine RAG**: Groq Llama 3.3 70B answers medication queries grounded strictly in user's saved medicine list
- **Vision AI**: Groq Vision (`llama-3.2-11b-vision`) identifies medicines from photos

### 5. 😊 Sentiment Analysis
> Hybrid elderly-specific mood tracking

- **AI Scoring**: Gemini 2.5 Flash rates messages 1–10
- **Pattern Matching**: 7 concern detectors (Loneliness, Health Decline, Emotional Distress, Abandonment, etc.)
- **Crisis Override**: Hard penalty forces near-zero scores when suicide/emergency keywords detected
- **MoodChart**: Recharts LineChart with green/yellow/red zones + emoji dots

### 6. 🗺️ Community Support
> Neighbour discovery and mutual aid

- **Leaflet.js Map**: Real-time geolocation with volunteer badges and distance display
- **Haversine Formula**: Accurate km-distance calculation between user and neighbours
- **Quick Actions**: One-tap calling, grocery help requests, medical assistance dispatch

---

## 🛠 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js (App Router) | 16.1 | React framework with SSR |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **Charts** | Recharts | 2.x | Data visualization (Area, Line, Bar) |
| **Maps** | Leaflet.js | 1.9 | Interactive community maps |
| **Animation** | Framer Motion | 12.x | Page transitions & micro-interactions |
| **LLM** | Google Gemini 2.5 Flash | — | RAG, sentiment, crisis detection |
| **Voice** | ElevenLabs | v2 | Multilingual Hindi/English TTS |
| **Vision** | Groq (Llama 3.2 Vision) | — | Medicine photo identification |
| **LLM (Alt)** | Groq (Llama 3.3 70B) | — | Medicine RAG Q&A |
| **STT** | Groq Whisper | v3-turbo | Audio transcription |
| **ML Backend** | Python FastAPI + uvicorn | — | Model serving (port 8000) |
| **ML Models** | Scikit-Learn | 1.6+ | IF, RF, GB ensemble + GoEmotions |
| **OCR** | Tesseract.js | WASM | In-browser medicine scanning |
| **SOS** | Twilio | — | Voice calls + SMS dispatch |
| **Video** | LiveKit / WebRTC | — | Real-time avatar streaming |

---

## 📁 Project Structure

```
ashalink/
├── app/
│   ├── api/                          # Next.js API Routes (server-side)
│   │   ├── rag-chat/route.ts         #   RAG pipeline + crisis detection
│   │   ├── sentiment/route.ts        #   Hybrid sentiment analysis
│   │   ├── sos/route.ts              #   Emergency voice calls + SMS
│   │   ├── sos-location/route.ts     #   GPS-based SMS alerts
│   │   ├── notify-caregiver/route.ts #   Caregiver event notifications
│   │   ├── tts/route.ts              #   ElevenLabs text-to-speech
│   │   ├── ml-anomaly/route.ts       #   Python ML backend proxy
│   │   ├── medicine-identify/route.ts#   Vision AI medicine ID
│   │   ├── medicine-rag/route.ts     #   Medicine Q&A (Groq)
│   │   ├── transcribe/route.ts       #   Whisper audio transcription
│   │   ├── clone/route.ts            #   Voice cloning
│   │   └── heygen/route.ts           #   LiveAvatar session tokens
│   │
│   ├── components/
│   │   ├── landing/                  # Landing page sections
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── ProblemStatement.tsx
│   │   │   ├── CompetitiveEdge.tsx
│   │   │   ├── CallToAction.tsx
│   │   │   └── Vision.tsx
│   │   ├── companion/               # AI Companion
│   │   │   ├── HumanSathi.tsx        #   Voice AI (STT → RAG → TTS)
│   │   │   ├── RagChat.tsx           #   Text chat interface
│   │   │   ├── VoiceCloner.tsx       #   Voice cloning UI
│   │   │   └── JoeAvatar.tsx         #   Static avatar
│   │   ├── dashboard/               # Caregiver dashboard
│   │   │   ├── MoodChart.tsx         #   Recharts mood visualization
│   │   │   ├── HealthAlerts.tsx      #   NLP keyword scanner
│   │   │   └── SeedDemoData.tsx      #   Demo data generator
│   │   ├── community/               # Community features
│   │   │   └── NeighbourMap.tsx      #   Leaflet map + Haversine
│   │   └── layout/                  # Shared layout
│   │       ├── Navbar.tsx
│   │       ├── DashboardNavbar.tsx
│   │       ├── Footer.tsx
│   │       ├── Sidebar.tsx
│   │       ├── LoginModal.tsx
│   │       └── Slideshow.tsx
│   │
│   ├── dashboard/                   # Dashboard pages
│   │   ├── page.tsx                  #   Electricity monitoring
│   │   ├── avatar/page.tsx           #   AI Companion
│   │   ├── medicines/page.tsx        #   Medicine management
│   │   ├── community/page.tsx        #   Neighbour map
│   │   ├── caregiver/page.tsx        #   Caregiver panel
│   │   ├── alerts/page.tsx           #   Safety alerts
│   │   └── layout.tsx                #   Dashboard shell
│   │
│   ├── page.tsx                     # Landing page
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Global styles
│
├── backend/                         # Python ML Backend
│   ├── main.py                      #   FastAPI server (port 8000)
│   ├── anomaly_predictor.py         #   3-model ensemble logic
│   ├── emotion_predictor.py         #   GoEmotions 28-class classifier
│   ├── train_models.py              #   Model training pipeline
│   ├── requirements.txt             #   Python dependencies
│   └── models/
│       ├── anomaly/                 #   IF, RF, GB, Scaler (.pkl)
│       └── emotion/                 #   TF-IDF, 4 OvR classifiers (.pkl)
│
├── public/
│   ├── rag_knowledge_base.json      # 5,700 counseling transcripts
│   ├── test_data.csv                # Sample electricity data
│   └── elderly-saathi.png           # Avatar image
│
├── types/
│   └── speech.d.ts                  # Web Speech API type declarations
│
└── Configuration
    ├── next.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── package.json
    └── .env.local                   # API keys (not committed)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **Python** ≥ 3.9
- **npm** or **yarn**

### 1. Clone & Install

```bash
git clone https://github.com/your-username/ashalink.git
cd ashalink

# Install frontend dependencies
npm install

# Install Python ML dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```env
# Core AI Intelligence
GEMINI_API_KEY=your_google_gemini_key

# Voice & Video
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key
HEYGEN_API_KEY=your_liveavatar_key

# Emergency SOS (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number

# Medicine AI (Groq)
GROQ_API_KEY=your_groq_key
```

### 3. Train ML Models (first time only)

```bash
cd backend
python3 train_models.py
```

### 4. Launch

```bash
# Terminal 1 — Frontend (Next.js)
npm run dev

# Terminal 2 — ML Backend (FastAPI)
cd backend
python3 -m uvicorn main:app --port 8000 --reload
```

Open **http://localhost:3000** in your browser.

---

## 🔑 Environment Variables

| Variable | Required | Used By | Purpose |
|----------|----------|---------|---------|
| `GEMINI_API_KEY` | ✅ | RAG Chat, Sentiment | Core LLM intelligence |
| `GROQ_API_KEY` | ✅ | Medicine, Transcribe | Vision AI, Llama 3.3, Whisper |
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | ✅ | TTS, Clone | Hindi/English voice synthesis |
| `TWILIO_ACCOUNT_SID` | ⚠️ | SOS | Emergency voice calls |
| `TWILIO_AUTH_TOKEN` | ⚠️ | SOS | Emergency SMS |
| `TWILIO_PHONE_NUMBER` | ⚠️ | SOS | Outgoing caller ID |
| `HEYGEN_API_KEY` | ⭕ | Avatar | LiveAvatar video (optional) |

> ✅ Required &nbsp; ⚠️ Required for SOS &nbsp; ⭕ Optional

---

## 🔬 Key Algorithms

### ML Ensemble — Majority Vote Anomaly Detection

```
Input: [kWh, hour, day_of_week]
    ↓
Feature Engineering (9 features):
    kWh, sin(2π·h/24), cos(2π·h/24), sin(2π·d/7), cos(2π·d/7),
    is_weekend, rolling_mean_24h, rolling_std_24h, kWh/rolling_mean
    ↓
RobustScaler (outlier-resistant normalization)
    ↓
┌──────────────────┬───────────────────┬────────────────────────┐
│ Isolation Forest │  Random Forest    │  Gradient Boosting     │
│  (unsupervised)  │   (supervised)    │    (supervised)        │
│  returns -1 / 1  │  returns 0 / 1    │   returns 0 / 1       │
└────────┬─────────┴─────────┬─────────┴──────────┬─────────────┘
         └──────────────────┐│┌────────────────────┘
                     Majority Vote (2/3)
                            ↓
                    ANOMALY or NORMAL
```

### RAG Retrieval — TF-IDF Keyword Matching

```
User message → tokenize → remove 46 stop words
    ↓
Score each of 5,700 knowledge entries:
    overlap_ratio = matched_tokens / query_tokens.length
    ↓
Sort by ratio → return top-5 contexts
    ↓
Inject into Gemini prompt as grounding context
```

### Crisis Detection — 3-Tier Bilingual Scanner

```
┌─────────────────────────────────────────────────┐
│ CRITICAL: suicide, kill myself, want to die...  │ → Auto Twilio call
│ HIGH:     chest pain, can't breathe, fell...    │ → SMS + caregiver alert
│ MODERATE: lonely, hopeless, crying, scared...   │ → Modified AI response
└─────────────────────────────────────────────────┘
Keywords in both English and Hindi (transliterated)
```

---

## 📡 API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/rag-chat` | RAG companion chat + crisis detection |
| `POST` | `/api/sentiment` | Hybrid sentiment analysis (1-10 score) |
| `POST` | `/api/sos` | Emergency Twilio voice calls + SMS |
| `POST` | `/api/sos-location` | GPS-based SMS to emergency contacts |
| `POST` | `/api/notify-caregiver` | Event-typed caregiver notifications |
| `POST` | `/api/tts` | ElevenLabs text-to-speech (Hindi) |
| `POST` | `/api/ml-anomaly` | Proxy to Python ML ensemble |
| `POST` | `/api/medicine-identify` | Vision AI medicine identification |
| `POST` | `/api/medicine-rag` | Medicine Q&A (grounded in user's list) |
| `POST` | `/api/transcribe` | Whisper audio transcription |
| `POST` | `/api/clone` | ElevenLabs voice cloning |
| `POST` | `/api/heygen` | LiveAvatar session token |

---

## 👥 Team

Built with ❤️ by the **AshaLink Team**

---

<p align="center">
  <sub>Privacy-first • Culturally aware • Built for India's elderly</sub>
</p>
