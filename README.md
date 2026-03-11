# 🔗 AshaLink — AI-Powered Elderly Care Platform

An intelligent elderly care companion built with **Next.js 16**, combining **AI companionship**, **real-time monitoring**, **medicine management**, and **community support** to help families care for their loved ones.

---

## ✨ Features

### 🏠 Smart Activity Monitoring
- Real-time electricity usage tracking as a proxy for daily activity patterns
- ML-based anomaly detection — flags unusual inactivity or high usage
- Interactive charts with color-coded alerts (Recharts)

### 🤖 AI Companion Avatar
- Lifelike AI companion powered by **HeyGen Streaming Avatar**
- Natural conversations with voice cloning via **ElevenLabs**
- **Hybrid Sentiment Analysis** — detects mood, loneliness, anxiety, family issues
- Mood trend chart with color-coded zones (happy / neutral / distressed)
- Caregiver alert banner when mood drops below threshold
- Enhanced 7-day downloadable Companion Report with mood summary

### 💊 Medicine Management + RAG
- Add, edit, delete medicines with localStorage persistence
- **AI Medicine Scanner** — upload a photo → Groq Vision API identifies the medicine
- **RAG Query Interface** — ask questions about your medicines, answered by Groq LLM using *only* your actual medicine data
- Browser notification reminders for medicine schedules

### 🚨 Safety Center (SOS & Community)
- **One-tap SOS button** triggers **Twilio voice calls** AND **SMS** to all emergency contacts simultaneously
- Hindi voice message via Amazon Polly (Aditi voice) built into Twilio TwiML
- Siren sound generator (Web Audio API)
- **Instant Location Sharing** — SMS your live GPS map link to contacts instantly
- Add/remove emergency contacts (persisted in localStorage)
- **Real neighbours** — add/remove neighbours stored in localStorage
- **Help request types** — Groceries, Medical, Companionship, Emergency (color-coded badges)
- **Verified volunteers** — signup with skills (First Aid, Cooking, Driving, etc.), shown as green dots on map
- Interactive map (Leaflet) with volunteer vs regular neighbour distinction
- **Caregiver SMS notifications** — son/daughter gets a Twilio SMS when:
  - A volunteer accepts a help request
  - An emergency help request goes unanswered
  - Mood drops or inactivity is detected



### 📋 Alerts & Notifications
- Color-coded alert cards (Critical / Warning / Info / Resolved)
- Medicine reminders, activity anomalies, companion check-ins

### 🔍 Government Schemes Discovery
- Search and browse elderly welfare schemes
- Voice search integration
- Category-based filtering

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 4 |
| **Charts** | Recharts |
| **Maps** | Leaflet + React-Leaflet |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Carousel** | Swiper |
| **AI Vision** | Groq API (Llama 3.2 Vision) |
| **AI LLM** | Groq API (Llama 3.3 70B) |
| **Sentiment** | `sentiment` npm (AFINN) + custom keyword patterns |
| **Voice Avatar** | HeyGen Streaming Avatar |
| **Voice Clone** | ElevenLabs |
| **Phone Calls** | Twilio (Voice API + TwiML) |
| **Storage** | localStorage (client-side, privacy-first) |

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
# ElevenLabs — Voice cloning
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key

# HeyGen — Streaming avatar
HEYGEN_API_KEY=your_heygen_key

# Twilio — SOS phone calls
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Groq — Medicine AI (Vision + LLM)
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
│   ├── clone/route.ts          # ElevenLabs voice cloning
│   ├── heygen/route.ts         # HeyGen avatar token
│   ├── medicine-identify/route.ts  # Groq Vision — photo medicine ID
│   ├── medicine-rag/route.ts   # Groq LLM — RAG medicine queries
│   ├── notify-caregiver/route.ts # Twilio SMS to caregiver on events
│   ├── sentiment/route.ts      # Hybrid sentiment analysis
│   └── sos/route.ts            # Twilio SOS phone calls
├── components/
│   ├── Navbar.tsx              # Landing page navbar
│   ├── DashboardNavbar.tsx     # Dashboard sidebar nav
│   ├── Hero.tsx                # Landing hero with Swiper
│   ├── Features.tsx            # Feature cards
│   ├── MoodChart.tsx           # Recharts mood trend chart
│   ├── LoginModal.tsx          # Login modal
│   ├── Footer.tsx              # Site footer
│   └── ...
├── dashboard/
│   ├── page.tsx                # Electricity monitoring dashboard
│   ├── avatar/page.tsx         # AI companion + sentiment
│   ├── medicines/page.tsx      # Medicine management + RAG
│   ├── community/page.tsx      # Unified Safety Center (SOS + Map)
│   └── alerts/page.tsx         # Notifications
└── page.tsx                    # Landing page
```

---

## 🔒 Privacy

- **No server-side storage** — medicines, contacts, and chat history are stored in `localStorage`
- **Sentiment analysis runs locally** — no conversations sent to external APIs for mood analysis
- **Electricity monitoring uses patterns** — no cameras or wearables

---

## 📄 License

This project is private. All rights reserved.

---

## 👥 Team

Built with ❤️ for elderly care.