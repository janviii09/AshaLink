# 🔗 AshaLink — AI-Powered Elderly Care Platform

An intelligent elderly care companion built with **Next.js 16**, combining **AI companionship**, **statistical anomaly detection**, **medicine OCR**, **community safety**, and **caregiver dashboards** to help families monitor and support their loved ones — with privacy at the core.

---

## ✨ Features

### 🏠 Smart Activity Monitoring (NILM-Based)
- Electricity usage tracking as a proxy for daily routines (Non-Intrusive Load Monitoring)
- **Z-score statistical anomaly detection** — computes per-hour mean (μ) and standard deviation (σ) from historical data; flags readings where |Z-score| > 2 (~95% confidence)
- **Adaptive routine learning** — thresholds automatically evolve as more data is collected; falls back to hardcoded ranges when < 3 data points exist per hour
- Collapsible "Learned Thresholds" table showing computed μ, σ, min, max per hour
- Interactive Recharts AreaChart with color-coded anomaly markers

### 🤖 AI Companion (Saathi)
- Real-time voice conversation powered by **ElevenLabs Conversational AI** via WebRTC
- Natural Hindi/English voice responses with customizable AI personality
- **Hybrid sentiment analysis** — AFINN-based word scoring + custom elderly-specific keyword patterns
- Mood trend chart with color-coded zones (happy / neutral / distressed)
- Caregiver alert banner when average mood drops below 4/10
- Enhanced 7-day downloadable Companion Report with mood summary

### 💊 Medicine Management + AI Scanner + RAG
- Add, edit, delete medicines with timing schedules (Morning/Afternoon/Evening/Night)
- **Cloud AI Scanner** — upload a photo → Groq Vision API identifies the medicine
- **🖥️ Local OCR Scanner (Tesseract.js)** — processes images entirely in-browser using WebAssembly; extracts medicine name, dosage (regex pattern matching for mg/ml/mcg), and manufacturer — **zero data sent to any server**
- **RAG Query Interface** — ask questions about your medicines, answered by Groq LLM using *only* your actual medicine data
- **Voice input** for medicine queries (MediaRecorder + Groq Whisper)
- Browser notification reminders for medicine schedules

### 🚨 Safety Center (SOS & Community)
- **One-tap SOS button** triggers **Twilio voice calls** AND **SMS** to all emergency contacts simultaneously
- Hindi voice message via Amazon Polly (Aditi voice) built into Twilio TwiML
- **Siren sound generator** (Web Audio API — sawtooth oscillator with LFO modulation)
- **Instant location sharing** — SMS your live Google Maps GPS link to contacts
- Add/remove emergency contacts (persisted in localStorage)
- **Community map** (Leaflet.js) showing neighbours and verified volunteers with Haversine distance calculation
- **Help request simulation** — Groceries, Medical, Companionship, Emergency (color-coded)
- **Volunteer signup** with skills (First Aid, Cooking, Driving, etc.)
- **Caregiver SMS notifications** via Twilio on key events

### 🧠 Health Keyword Alerts (Local NLP)
- Scans all AI companion transcripts against **8 keyword dictionaries**: Pain & Discomfort, Sleep Issues, Appetite, Mobility & Falls, Emotional Distress, Loneliness, Confusion & Memory, Medication Mentions
- Counts keyword frequencies per category across last 7 days
- Severity classification: Normal (1-2 mentions) / Attention Needed (3-5) / Urgent (6+)
- Also detects mentions of specific medicines from the user's medicine list
- **Runs entirely in the browser — no API calls, pure pattern recognition**

### 👨‍👩‍👧 Caregiver Dashboard
- **Mood Trend Chart** — 7-day LineChart of sentiment scores with alert/good reference lines, trend detection (improving/stable/declining)
- **Daily Anomaly Count** — BarChart of electricity anomalies per day, color-coded green/amber/red
- **Medication Compliance** — shows tracked vs untracked medicines with compliance percentage
- **Health Keyword Alerts** — embedded weekly summary of concerning keywords from conversations
- **Downloadable Report** — text report aggregating all 4 sections

### 📋 Alerts & Notifications
- Color-coded alert cards (Critical / Warning / Info / Resolved)
- Medicine reminders, activity anomalies, companion check-ins

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Charts** | Recharts | AreaChart, LineChart, BarChart |
| **Maps** | Leaflet.js | Interactive community map |
| **Animations** | Framer Motion | Smooth UI transitions |
| **Icons** | Lucide React | Consistent icon set |
| **AI Voice** | ElevenLabs (WebRTC) | Real-time voice companion |
| **AI Vision** | Groq API (Llama 3.2 Vision) | Medicine photo identification |
| **AI LLM** | Groq API (Llama 3.3 70B) | RAG medicine queries |
| **OCR** | Tesseract.js (WebAssembly) | Local in-browser text extraction |
| **Sentiment** | `sentiment` npm (AFINN) + custom patterns | Mood analysis |
| **Phone Calls** | Twilio (Voice API + TwiML) | SOS emergency calls & SMS |
| **Audio** | Web Audio API | Siren sound generation |
| **Storage** | localStorage | Client-side, privacy-first persistence |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/Nishita-shah1/apkasaathi.git
cd apkasaathi

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# ElevenLabs — Voice companion
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key

# HeyGen — Streaming avatar (optional)
HEYGEN_API_KEY=your_heygen_key

# Twilio — SOS phone calls & SMS
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Groq — Medicine AI (Vision + LLM + Whisper)
GROQ_API_KEY=your_groq_key
```

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) |
| `HEYGEN_API_KEY` | [heygen.com](https://heygen.com) |
| `TWILIO_ACCOUNT_SID` / `AUTH_TOKEN` / `PHONE_NUMBER` | [console.twilio.com](https://console.twilio.com) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
app/
├── api/
│   ├── clone/route.ts              # ElevenLabs voice cloning
│   ├── heygen/route.ts             # HeyGen avatar token
│   ├── medicine-identify/route.ts  # Groq Vision — photo medicine ID
│   ├── medicine-rag/route.ts       # Groq LLM — RAG medicine queries
│   ├── notify-caregiver/route.ts   # Twilio SMS to caregiver
│   ├── sentiment/route.ts          # Hybrid sentiment analysis (AFINN + keywords)
│   ├── sos/route.ts                # Twilio SOS voice calls + SMS
│   ├── sos-location/route.ts       # SMS GPS location link
│   └── transcribe/route.ts         # Groq Whisper — voice-to-text
├── components/
│   ├── avatar/
│   │   └── HumanSathi.tsx          # ElevenLabs voice companion UI
│   ├── DashboardNavbar.tsx         # Dashboard navigation bar
│   ├── HealthAlerts.tsx            # Keyword-based health alert scanner
│   ├── LoginModal.tsx              # Login form modal
│   ├── MoodChart.tsx               # Recharts mood trend chart
│   ├── NeighbourMap.tsx            # Leaflet community map
│   ├── Navbar.tsx                  # Landing page navbar
│   ├── Hero.tsx                    # Landing hero with Swiper slideshow
│   ├── Features.tsx                # Feature showcase cards
│   ├── ProblemStatement.tsx        # Problem context section
│   ├── CompetitiveEdge.tsx         # Comparison with competitors
│   ├── CallToAction.tsx            # CTA section
│   └── Footer.tsx                  # Site footer
├── dashboard/
│   ├── layout.tsx                  # Shared dashboard layout + navbar
│   ├── page.tsx                    # Electricity monitoring (Z-score anomaly detection)
│   ├── avatar/page.tsx             # AI companion + sentiment + mood chart
│   ├── caregiver/page.tsx          # Caregiver dashboard (mood + anomalies + meds)
│   ├── community/page.tsx          # Safety Center (SOS + map + volunteers)
│   ├── medicines/page.tsx          # Medicine management + OCR + RAG
│   └── alerts/page.tsx             # Alerts & notifications
├── layout.tsx                      # Root layout (font, metadata, global CSS)
└── page.tsx                        # Landing page
```

---

## 🔬 Key Algorithms & Techniques

### Z-Score Statistical Anomaly Detection
For each hour (0–23), the system computes mean and standard deviation from historical electricity readings. A reading is flagged as anomalous when `|Z-score| > 2`, meaning it deviates by more than 2 standard deviations — corresponding to ~95% statistical confidence.

### Haversine Formula
Calculates the great-circle distance between two GPS coordinates on a sphere, used for measuring real-world distance to neighbours on the community map.

### Hybrid Sentiment Analysis
Combines AFINN lexicon scoring (pre-assigned word sentiment values) with custom keyword pattern matching for elderly-specific concerns. No external API required.

### Tesseract.js OCR
WebAssembly-compiled Optical Character Recognition running entirely in the browser. Extracts text from medicine packaging images and uses regex patterns to identify dosage and manufacturer info.

### TF-IDF Keyword Extraction
Health keyword alerts use frequency-based analysis across conversation transcripts, counting how often health-related terms appear in each category over a 7-day window.

---

## 🔒 Privacy

- **No server-side storage** — medicines, contacts, chat history, and electricity data stored in `localStorage`
- **Sentiment analysis runs locally** — no conversations sent to external APIs for mood analysis
- **Local OCR option** — Tesseract.js processes medicine images in-browser (no data leaves the device)
- **Electricity monitoring uses patterns** — no cameras or wearables
- **Health keyword scanning is client-side** — transcript analysis runs entirely in the browser

---

## 📄 License

This project is private. All rights reserved.

---

## 👥 Team

Built with ❤️ for elderly care.