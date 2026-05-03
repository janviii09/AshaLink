'use client';

/**
 * SeedDemoData — Pre-populate 7-day realistic conversation data
 * 
 * PURPOSE:
 * When showing to your teacher, the mood chart and caregiver dashboard
 * need historical data to look impressive. This component seeds
 * realistic conversation data spanning 7 days.
 * 
 * HOW IT WORKS:
 * - Generates 3-5 conversations per day for 7 days
 * - Each conversation has realistic elderly Indian user messages
 * - Sentiment scores vary naturally (mostly 5-8, with some dips)
 * - Data is saved to localStorage, same as real conversations
 * 
 * USAGE:
 * Import this component anywhere and render it.
 * It shows a button: "Load Demo Data (7 Days)"
 * Once clicked, all charts and dashboards fill up instantly.
 */

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
  sentiment?: {
    sentiment: string;
    score: number;
    explanation: string;
    concerns: { label: string; emoji: string; message: string }[];
  };
}

// Realistic sample conversations with varied moods
const SAMPLE_CONVERSATIONS: {
  user: string;
  ai: string;
  score: number;
  sentiment: string;
  concerns: { label: string; emoji: string; message: string }[];
}[] = [
  // Happy messages (score 7-9)
  {
    user: "My grandson called me today! He is doing well in college.",
    ai: "That's wonderful! It must fill your heart with so much pride and joy. College is such an exciting time. Do you speak with him regularly?",
    score: 9, sentiment: 'happy', concerns: [],
  },
  {
    user: "I went for a walk in the morning and the weather was beautiful.",
    ai: "How lovely! Morning walks are such a blessing, especially when the weather cooperates. The fresh air must have felt refreshing. Do you walk every day?",
    score: 8, sentiment: 'happy', concerns: [],
  },
  {
    user: "I cooked rajma chawal today and it turned out very nice.",
    ai: "Oh, rajma chawal — comfort food at its best! Cooking can be so therapeutic. Did you enjoy it with someone or had it by yourself?",
    score: 8, sentiment: 'happy', concerns: [],
  },
  {
    user: "I watched a nice devotional program on TV today.",
    ai: "That sounds very peaceful. Devotional programs can bring so much calm and inner peace. Do you have a favourite one that you watch regularly?",
    score: 7, sentiment: 'happy', concerns: [],
  },
  {
    user: "My neighbour brought me some sweets for the festival.",
    ai: "How sweet of your neighbour! It's wonderful to have caring people around. Which festival are you celebrating? I hope you enjoyed the mithai!",
    score: 9, sentiment: 'happy', concerns: [],
  },

  // Neutral messages (score 4-6)
  {
    user: "Today was a normal day, nothing special happened.",
    ai: "Quiet days have their own charm. Sometimes a calm, peaceful day is exactly what we need. Did you do anything relaxing?",
    score: 6, sentiment: 'neutral', concerns: [],
  },
  {
    user: "I had my medicines on time today.",
    ai: "That's great discipline! Taking medicines on time is very important. How are you feeling health-wise today?",
    score: 6, sentiment: 'neutral', concerns: [],
  },
  {
    user: "The electricity went out for 2 hours today.",
    ai: "Oh no, power cuts can be quite inconvenient, especially in the heat. I hope it's back now. Did you manage okay during that time?",
    score: 5, sentiment: 'neutral', concerns: [],
  },
  {
    user: "I am feeling a bit tired today.",
    ai: "It's okay to have tired days. Make sure you're drinking enough water and getting some rest. Would you like me to suggest a gentle relaxation exercise?",
    score: 5, sentiment: 'neutral',
    concerns: [{ label: 'Fatigue', emoji: '😴', message: 'User reports feeling tired' }],
  },
  {
    user: "I did not sleep well last night.",
    ai: "I'm sorry to hear that. Poor sleep can really affect how we feel. Have you tried some gentle breathing exercises before bed? They can help calm the mind.",
    score: 4, sentiment: 'neutral',
    concerns: [{ label: 'Sleep Issues', emoji: '🌙', message: 'User reports poor sleep' }],
  },

  // Sad messages (score 2-4)
  {
    user: "Nobody called me today. I feel a little sad.",
    ai: "I understand how that feels. We all want to hear from our loved ones. Sometimes people get busy, but it doesn't mean they don't care. Would you like to try calling someone you'd like to talk to?",
    score: 4, sentiment: 'sad',
    concerns: [{ label: 'Loneliness', emoji: '😔', message: 'User feels lonely and disconnected' }],
  },
  {
    user: "I miss my wife very much today. The house feels empty.",
    ai: "I can only imagine how much you miss her. Grief comes in waves, and it's completely natural. Her memories will always be with you. Would you like to share a favourite memory of her?",
    score: 3, sentiment: 'sad',
    concerns: [{ label: 'Grief', emoji: '💔', message: 'User is grieving the loss of spouse' }],
  },
  {
    user: "My knees are paining a lot today, I could not go outside.",
    ai: "I'm sorry about the knee pain. It must be frustrating not being able to go outside. Please make sure to rest and consider consulting your doctor if the pain continues. Some gentle seated exercises might help too.",
    score: 4, sentiment: 'sad',
    concerns: [{ label: 'Health Pain', emoji: '🤕', message: 'User reports physical pain' }],
  },
  {
    user: "I feel like nobody needs me anymore. My children are all busy.",
    ai: "Please don't feel that way. Your children love you very much — life can just get hectic sometimes. You are valued and important. Have you tried calling them? Sometimes a small call can brighten everyone's day.",
    score: 3, sentiment: 'sad',
    concerns: [{ label: 'Loneliness', emoji: '😔', message: 'User feels unneeded by family' }],
  },
  {
    user: "I am worried about my health report. Doctor said some things need checking.",
    ai: "It's natural to worry, but please try not to stress too much before knowing the details. Your doctor is there to help. Would you like me to help you prepare some questions for your next visit?",
    score: 3, sentiment: 'sad',
    concerns: [{ label: 'Health Anxiety', emoji: '🏥', message: 'User worried about medical reports' }],
  },
];

function generateDemoData(): Message[] {
  const messages: Message[] = [];
  const now = new Date();

  // Generate conversations for the last 7 days
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);

    // 3-5 conversations per day
    const conversationsToday = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < conversationsToday; i++) {
      // Random time between 7 AM and 9 PM
      const hour = 7 + Math.floor(Math.random() * 14);
      const minute = Math.floor(Math.random() * 60);
      day.setHours(hour, minute, 0, 0);

      const conv = SAMPLE_CONVERSATIONS[Math.floor(Math.random() * SAMPLE_CONVERSATIONS.length)];

      // Add some natural variation to scores (+/- 1)
      const scoreVariation = Math.random() > 0.5 ? 1 : -1;
      const adjustedScore = Math.max(1, Math.min(10, conv.score + (Math.random() > 0.7 ? scoreVariation : 0)));

      // User message
      messages.push({
        role: 'user',
        text: conv.user,
        timestamp: new Date(day).toISOString(),
        sentiment: {
          sentiment: conv.sentiment,
          score: adjustedScore,
          explanation: `Detected ${conv.sentiment} mood with score ${adjustedScore}/10`,
          concerns: conv.concerns,
        },
      });

      // AI response (30 seconds later)
      const aiTime = new Date(day.getTime() + 30000);
      messages.push({
        role: 'ai',
        text: conv.ai,
        timestamp: aiTime.toISOString(),
      });
    }
  }

  // Sort by timestamp
  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return messages;
}

export default function SeedDemoData() {
  const handleSeed = () => {
    const existing = localStorage.getItem('avatar_messages');
    const existingMessages: Message[] = existing ? JSON.parse(existing) : [];

    const demoData = generateDemoData();

    // Merge demo data with any existing real data
    const merged = [...demoData, ...existingMessages];
    merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    localStorage.setItem('avatar_messages', JSON.stringify(merged));

    // Also set a sample elder name if not set
    if (!localStorage.getItem('elder_name')) {
      localStorage.setItem('elder_name', 'Nisha');
    }

    alert('✅ Demo data loaded! 7 days of realistic conversations have been added. Please refresh the page to see the mood charts.');
    window.location.reload();
  };

  const handleClear = () => {
    localStorage.removeItem('avatar_messages');
    alert('🗑️ All conversation data cleared. Refresh to see empty state.');
    window.location.reload();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleSeed}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors text-sm"
      >
        📊 Load Demo Data (7 Days)
      </button>
      <button
        onClick={handleClear}
        className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-xl shadow-md transition-colors text-sm"
      >
        🗑️ Clear Data
      </button>
    </div>
  );
}
