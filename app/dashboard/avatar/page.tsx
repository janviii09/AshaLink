'use client';

import { useState, useEffect, useRef } from 'react';
import HumanSathi from '@/app/components/avatar/HumanSathi';
import MoodChart from '@/app/components/MoodChart';
import { Download, AlertTriangle } from 'lucide-react';

/**
 * /dashboard/avatar — AI Companion Page (Enhanced with Sentiment Analysis)
 * 
 * WHAT CHANGED from the original:
 * 
 * 1. Message interface now includes optional `sentiment` data
 *    - Each user message gets analyzed for mood after it's sent
 *    - The sentiment data is stored alongside the message in localStorage
 * 
 * 2. Sentiment analysis runs in the background (non-blocking)
 *    - After each user message, we call /api/sentiment in the background
 *    - This doesn't slow down the conversation
 *    - Uses the hybrid approach: AFINN word scores + custom keyword patterns
 * 
 * 3. MoodChart component shows mood trends
 *    - A Recharts line chart below the transcript panel
 *    - Green/yellow/red zones for visual at-a-glance understanding
 * 
 * 4. Caregiver Alert Banner
 *    - If the average mood over the last 5 messages drops below 4/10,
 *      a warning banner appears at the top
 *    - Also surfaces specific concerns (loneliness, health distress, etc.)
 * 
 * 5. Enhanced 7-day report
 *    - The downloaded report now includes a MOOD SUMMARY section
 *    - Shows: average score, most common mood, lowest point, flagged concerns
 */

// ─── Types ───────────────────────────────────────────────────────────

interface SentimentData {
  sentiment: string;     // 'happy' | 'neutral' | 'sad' | 'distressed'
  score: number;         // 1-10 scale
  explanation: string;   // Human-readable explanation
  concerns: {            // Elderly-specific concerns detected
    label: string;
    emoji: string;
    message: string;
  }[];
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO string
  sentiment?: SentimentData;  // Only present for user messages that have been analyzed
}

// ─── Component ───────────────────────────────────────────────────────

export default function AvatarPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Load messages from localStorage on mount ────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('avatar_messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse messages from localStorage", e);
      }
    }
  }, []);

  // ─── Save messages to localStorage whenever they change ──────────
  useEffect(() => {
    localStorage.setItem('avatar_messages', JSON.stringify(messages));
  }, [messages]);

  // ─── Auto-scroll the log to the bottom ───────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Handle new message from HumanSathi ──────────────────────────
  const handleNewMessage = (role: 'user' | 'ai', text: string) => {
    const newMessage: Message = {
      role,
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // If it's a user message, analyze sentiment in the background
    // This is NON-BLOCKING — it doesn't delay the conversation
    if (role === 'user') {
      analyzeSentiment(text, newMessage.timestamp);
    }
  };

  // ─── Sentiment Analysis (background, non-blocking) ───────────────
  /**
   * WHY background/non-blocking?
   * We don't want the user to wait for sentiment analysis before seeing their
   * message in the transcript. The analysis runs in parallel and updates the
   * message once it completes.
   */
  const analyzeSentiment = async (text: string, timestamp: string) => {
    try {
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const sentimentData: SentimentData = await response.json();

        // Update the specific message with sentiment data
        // We match by timestamp since it's unique to each message
        setMessages(prev =>
          prev.map(msg =>
            msg.timestamp === timestamp && msg.role === 'user'
              ? { ...msg, sentiment: sentimentData }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      // Silently fail — sentiment is non-critical, don't break the conversation
    }
  };

  // ─── Compute mood data for the chart ─────────────────────────────
  /**
   * We extract mood data points from all user messages that have sentiment data.
   * This feeds into the MoodChart component.
   */
  const moodData = messages
    .filter(msg => msg.role === 'user' && msg.sentiment)
    .map(msg => ({
      timestamp: msg.timestamp,
      score: msg.sentiment!.score,
      sentiment: msg.sentiment!.sentiment,
    }));

  // ─── Compute caregiver alert ─────────────────────────────────────
  /**
   * If the average mood over the LAST 5 user messages is below 4/10,
   * we show a warning banner. We also collect all unique concerns.
   */
  const recentMoodMessages = messages
    .filter(msg => msg.role === 'user' && msg.sentiment)
    .slice(-5);

  const averageMood = recentMoodMessages.length > 0
    ? recentMoodMessages.reduce((sum, msg) => sum + (msg.sentiment?.score || 5), 0) / recentMoodMessages.length
    : null;

  const showCaregiverAlert = averageMood !== null && averageMood < 4;

  // Collect unique concerns from recent messages
  const recentConcerns = recentMoodMessages
    .flatMap(msg => msg.sentiment?.concerns || [])
    .filter((concern, index, self) =>
      self.findIndex(c => c.label === concern.label) === index
    );

  // ─── Enhanced 7-day report download ──────────────────────────────
  const handleDownloadReport = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const relevantMessages = messages.filter(msg => new Date(msg.timestamp) >= sevenDaysAgo);

    if (relevantMessages.length === 0) {
      alert("No transcripts found for the last 7 days.");
      return;
    }

    // ─── MOOD SUMMARY section (new!) ───────────────────────────────
    const userMessagesWithSentiment = relevantMessages.filter(
      msg => msg.role === 'user' && msg.sentiment
    );

    let moodSummary = '';
    if (userMessagesWithSentiment.length > 0) {
      const avgScore = userMessagesWithSentiment.reduce(
        (sum, msg) => sum + (msg.sentiment?.score || 5), 0
      ) / userMessagesWithSentiment.length;

      // Find most common mood
      const moodCounts: Record<string, number> = {};
      userMessagesWithSentiment.forEach(msg => {
        const s = msg.sentiment?.sentiment || 'neutral';
        moodCounts[s] = (moodCounts[s] || 0) + 1;
      });
      const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

      // Find lowest point
      const lowestMsg = userMessagesWithSentiment.reduce((lowest, msg) =>
        (msg.sentiment?.score || 10) < (lowest.sentiment?.score || 10) ? msg : lowest
      );
      const lowestDate = new Date(lowestMsg.timestamp).toLocaleDateString([], {
        month: 'long', day: 'numeric', year: 'numeric'
      });

      // Collect all concerns from the 7-day period
      const allConcerns = userMessagesWithSentiment
        .flatMap(msg => msg.sentiment?.concerns || [])
        .filter((concern, index, self) =>
          self.findIndex(c => c.label === concern.label) === index
        );

      moodSummary = `
=== MOOD SUMMARY (Last 7 Days) ===
Average Score: ${avgScore.toFixed(1)}/10
Most Common Mood: ${mostCommonMood}
Lowest Point: "${lowestMsg.sentiment?.sentiment}" (score ${lowestMsg.sentiment?.score}) on ${lowestDate}
Total Messages Analyzed: ${userMessagesWithSentiment.length}
${allConcerns.length > 0
          ? `\nConcerns Detected:\n${allConcerns.map(c => `  ${c.emoji} ${c.label}: ${c.message}`).join('\n')}`
          : '\nNo major concerns detected.'
        }

`;
    }

    // ─── TRANSCRIPT section ────────────────────────────────────────
    const transcript = relevantMessages.map(msg => {
      const date = new Date(msg.timestamp).toLocaleString();
      const speaker = msg.role === 'user' ? 'Me' : 'Companion';
      const sentimentTag = msg.sentiment
        ? ` (${msg.sentiment.sentiment === 'happy' ? '😊' : msg.sentiment.sentiment === 'sad' ? '😢' : msg.sentiment.sentiment === 'distressed' ? '😰' : '😐'} ${msg.sentiment.sentiment}, ${msg.sentiment.score}/10)`
        : '';
      return `[${date}] ${speaker}: ${msg.text}${sentimentTag}`;
    }).join('\n\n');

    const reportContent = `AshaLink — 7-Day Companion Report
Generated: ${new Date().toLocaleString()}
${'='.repeat(50)}

${moodSummary}=== TRANSCRIPT ===
${transcript}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ashalink_report_7days_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-6 py-8 min-h-screen flex flex-col bg-gray-50">
      {/* ── Caregiver Alert Banner ──────────────────────────────── */}
      {showCaregiverAlert && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 text-lg">
                ⚠️ Mood Alert: Your loved one&apos;s emotional well-being has been declining
              </h3>
              <p className="text-red-700 mt-1">
                Average mood over last {recentMoodMessages.length} messages: <strong>{averageMood?.toFixed(1)}/10</strong>. Consider reaching out.
              </p>
              {recentConcerns.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-red-800">Specific concerns detected:</p>
                  {recentConcerns.map((concern, i) => (
                    <p key={i} className="text-sm text-red-700 ml-4">
                      {concern.emoji} <strong>{concern.label}:</strong> {concern.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-800">AshaLink Companion</h1>
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors"
        >
          <Download size={20} />
          Download 7-Day Report
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Conversation Log Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 flex flex-col h-[550px]">
            <div className="p-4 border-b font-semibold text-gray-700">Live Transcript</div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-gray-400 italic">
                  Start the conversation to see the transcript...
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}>
                    <p className="text-xs opacity-70 mb-1">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {/* Show sentiment alongside user messages */}
                    {msg.sentiment && (
                      <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-80">
                        <span>
                          {msg.sentiment.sentiment === 'happy' ? '😊' :
                            msg.sentiment.sentiment === 'neutral' ? '😐' :
                              msg.sentiment.sentiment === 'sad' ? '😢' : '😰'}{' '}
                          {msg.sentiment.score}/10
                        </span>
                        {msg.sentiment.concerns.length > 0 && (
                          <span className="ml-2">
                            {msg.sentiment.concerns.map(c => c.emoji).join(' ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Mood Trend Chart ─────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">📊 Mood Trend</h2>
            <MoodChart data={moodData} />
          </div>
        </div>

        {/* Human Avatar Section */}
        <div className="lg:col-span-1 sticky top-8">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
            <HumanSathi onMessageReceived={handleNewMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}