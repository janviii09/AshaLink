'use client';

import { useMemo } from 'react';
import { AlertTriangle, Heart, Pill, Brain, Activity, Moon, Thermometer, ShieldAlert } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface KeywordMatch {
  category: string;
  emoji: string;
  icon: React.ReactNode;
  keyword: string;
  count: number;
  severity: 'normal' | 'attention' | 'urgent';
  color: string;
}

interface HealthAlertsSummary {
  matches: KeywordMatch[];
  totalMessages: number;
  analyzedCount: number;
  overallSeverity: 'normal' | 'attention' | 'urgent';
}

// ─── Keyword Dictionaries ─────────────────────────────────────────────────

/**
 * These keyword dictionaries are specifically designed for elderly care.
 * Each category contains synonyms and common phrases an elderly person
 * might use when describing their condition.
 * 
 * The system scans ALL user messages from localStorage ('avatar_messages')
 * and counts how many times keywords from each category appear.
 * 
 * Severity thresholds:
 *   - 1-2 mentions/week → Normal (just tracking)
 *   - 3-5 mentions/week → Attention Needed (caregiver should check in)
 *   - 6+ mentions/week  → Urgent (immediate action recommended)
 */

const KEYWORD_CATEGORIES: {
  category: string;
  emoji: string;
  icon: React.ReactNode;
  color: string;
  keywords: string[];
}[] = [
  {
    category: 'Pain & Discomfort',
    emoji: '🤕',
    icon: <Thermometer className="w-4 h-4" />,
    color: 'red',
    keywords: [
      'pain', 'hurting', 'headache', 'body ache', 'stomach ache', 'back pain',
      'joint pain', 'knee pain', 'chest pain', 'neck pain', 'sore', 'aching',
      'cramp', 'stiff', 'stiffness', 'burning', 'sharp pain', 'throbbing',
    ],
  },
  {
    category: 'Sleep Issues',
    emoji: '😴',
    icon: <Moon className="w-4 h-4" />,
    color: 'indigo',
    keywords: [
      "can't sleep", 'not sleeping', 'insomnia', 'sleepless', 'restless',
      'nightmares', 'bad dreams', 'waking up', 'tossing and turning',
      'trouble sleeping', "couldn't sleep", 'sleep problem', 'no sleep',
    ],
  },
  {
    category: 'Appetite & Eating',
    emoji: '🍽️',
    icon: <Activity className="w-4 h-4" />,
    color: 'amber',
    keywords: [
      'not eating', "can't eat", 'no appetite', 'lost appetite', 'not hungry',
      "don't feel like eating", 'skipped meal', 'forgot to eat', 'nausea',
      'vomiting', 'stomach upset', "can't keep food", 'lost weight',
    ],
  },
  {
    category: 'Mobility & Falls',
    emoji: '🦽',
    icon: <ShieldAlert className="w-4 h-4" />,
    color: 'orange',
    keywords: [
      'fell', 'fell down', 'stumbled', 'tripped', 'lost balance',
      "can't walk", 'difficulty walking', 'need support', 'wheelchair',
      'walker', 'cane', 'dizzy', 'dizziness', 'lightheaded', 'unsteady',
    ],
  },
  {
    category: 'Emotional Distress',
    emoji: '😢',
    icon: <Heart className="w-4 h-4" />,
    color: 'pink',
    keywords: [
      'sad', 'crying', 'depressed', 'hopeless', 'worthless', 'burden',
      'give up', 'no point', "don't want to", 'tired of everything',
      "can't take it", 'miserable', 'unhappy', 'heartbroken', 'devastated',
    ],
  },
  {
    category: 'Loneliness',
    emoji: '😔',
    icon: <Heart className="w-4 h-4" />,
    color: 'purple',
    keywords: [
      'lonely', 'alone', 'nobody visits', 'no one cares', 'forgotten',
      'abandoned', 'isolated', 'all alone', 'no friends', 'no company',
      'miss my family', 'miss my children', 'wish they would visit',
    ],
  },
  {
    category: 'Confusion & Memory',
    emoji: '🧠',
    icon: <Brain className="w-4 h-4" />,
    color: 'teal',
    keywords: [
      'forgot', 'forgetful', 'confused', "can't remember", 'memory',
      'lost my way', "don't remember", 'mix up', 'mixed up',
      'where am i', 'what day is it', 'keep forgetting', 'confused about',
    ],
  },
  {
    category: 'Medication Mentions',
    emoji: '💊',
    icon: <Pill className="w-4 h-4" />,
    color: 'green',
    keywords: [
      'medicine', 'medication', 'tablet', 'pill', 'dose', 'forgot medicine',
      'missed dose', 'side effect', 'medicine not working', 'prescription',
      'need refill', 'pharmacy', 'doctor said', 'blood pressure', 'sugar level',
      'diabetes', 'insulin', 'cholesterol',
    ],
  },
];

// ─── Analysis Engine ──────────────────────────────────────────────────────

function analyzeTranscripts(daysBack: number = 7): HealthAlertsSummary {
  // Read messages from localStorage (same key as AI companion page)
  let messages: { role: string; text: string; timestamp: string }[] = [];
  try {
    const saved = localStorage.getItem('avatar_messages');
    if (saved) messages = JSON.parse(saved);
  } catch { /* ignore */ }

  // Filter to user messages within the time window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const userMessages = messages.filter(
    (m) => m.role === 'user' && new Date(m.timestamp) >= cutoff
  );

  // Scan each message against all keyword categories
  const matchCounts: Record<string, { count: number; keyword: string }> = {};

  for (const msg of userMessages) {
    const textLower = msg.text.toLowerCase();

    for (const cat of KEYWORD_CATEGORIES) {
      for (const keyword of cat.keywords) {
        if (textLower.includes(keyword)) {
          if (!matchCounts[cat.category]) {
            matchCounts[cat.category] = { count: 0, keyword };
          }
          matchCounts[cat.category].count++;
          break; // Count max once per message per category
        }
      }
    }
  }

  // Also check for medicine names from user_medicines localStorage
  try {
    const savedMeds = localStorage.getItem('user_medicines');
    if (savedMeds) {
      const meds = JSON.parse(savedMeds) as { name: string }[];
      for (const msg of userMessages) {
        const textLower = msg.text.toLowerCase();
        for (const med of meds) {
          if (textLower.includes(med.name.toLowerCase())) {
            const key = `Mentioned "${med.name}"`;
            if (!matchCounts[key]) {
              matchCounts[key] = { count: 0, keyword: med.name };
            }
            matchCounts[key].count++;
          }
        }
      }
    }
  } catch { /* ignore */ }

  // Build results with severity classification
  const matches: KeywordMatch[] = [];

  for (const cat of KEYWORD_CATEGORIES) {
    const match = matchCounts[cat.category];
    if (match && match.count > 0) {
      let severity: 'normal' | 'attention' | 'urgent' = 'normal';
      if (match.count >= 6) severity = 'urgent';
      else if (match.count >= 3) severity = 'attention';

      matches.push({
        category: cat.category,
        emoji: cat.emoji,
        icon: cat.icon,
        keyword: match.keyword,
        count: match.count,
        severity,
        color: cat.color,
      });
    }
  }

  // Sort by count (most frequent first)
  matches.sort((a, b) => b.count - a.count);

  // Overall severity
  let overallSeverity: 'normal' | 'attention' | 'urgent' = 'normal';
  if (matches.some((m) => m.severity === 'urgent')) overallSeverity = 'urgent';
  else if (matches.some((m) => m.severity === 'attention')) overallSeverity = 'attention';

  return {
    matches,
    totalMessages: messages.length,
    analyzedCount: userMessages.length,
    overallSeverity,
  };
}

// ─── Severity Styles ──────────────────────────────────────────────────────

const severityConfig = {
  normal: { label: 'Normal', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  attention: { label: 'Attention Needed', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  urgent: { label: 'Urgent', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

// ─── Component ────────────────────────────────────────────────────────────

interface HealthAlertsProps {
  compact?: boolean; // If true, renders a smaller version for embedding
}

export default function HealthAlerts({ compact = false }: HealthAlertsProps) {
  const summary = useMemo(() => analyzeTranscripts(7), []);

  if (summary.analyzedCount === 0) {
    return (
      <div className={`${compact ? 'p-4' : 'p-8'} text-center text-gray-400`}>
        <Brain className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No conversation data found</p>
        <p className="text-sm mt-1">
          Start talking to the AI Companion to enable health keyword tracking.
        </p>
      </div>
    );
  }

  const overallStyle = severityConfig[summary.overallSeverity];

  return (
    <div className={compact ? '' : 'space-y-4'}>
      {/* Header / Overall Status */}
      <div className={`flex items-center justify-between ${compact ? 'mb-3' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${overallStyle.bg} ${overallStyle.text}`}>
            {overallStyle.label}
          </span>
          <span className="text-xs text-gray-500">
            {summary.analyzedCount} messages analyzed (last 7 days)
          </span>
        </div>
      </div>

      {/* Keyword Matches */}
      {summary.matches.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          <p className="text-sm">✅ No concerning keywords detected this week.</p>
        </div>
      ) : (
        <div className={`space-y-2 ${compact ? '' : 'space-y-3'}`}>
          {summary.matches.map((match, i) => {
            const sev = severityConfig[match.severity];
            return (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-xl border ${sev.border} ${sev.bg}/30 hover:${sev.bg}/50 transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{match.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{match.category}</p>
                    <p className="text-xs text-gray-500">
                      keyword matched: &ldquo;{match.keyword}&rdquo;
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sev.bg} ${sev.text}`}>
                    {match.count}×
                  </span>
                  {match.severity !== 'normal' && (
                    <AlertTriangle className={`w-4 h-4 ${match.severity === 'urgent' ? 'text-red-500' : 'text-amber-500'}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explanation */}
      {!compact && (
        <p className="text-xs text-gray-400 mt-4">
          <strong>How it works:</strong> All user messages to the AI Companion are scanned locally (no API calls)
          against dictionaries of health-related keywords. Frequency thresholds: 1-2 mentions = Normal,
          3-5 = Attention Needed, 6+ = Urgent. This is pattern recognition applied to natural language processing.
        </p>
      )}
    </div>
  );
}
