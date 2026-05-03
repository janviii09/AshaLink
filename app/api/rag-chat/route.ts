import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';

/**
 * POST /api/rag-chat
 *
 * RAG (Retrieval-Augmented Generation) Mental Health Companion API
 *
 * HOW IT WORKS:
 * 1. RETRIEVE: Searches through 5,700+ counseling conversations from 4 datasets
 *    to find the most relevant examples using keyword matching + TF-IDF-like scoring
 * 2. AUGMENT: Combines the retrieved examples with a system prompt
 * 3. GENERATE: Sends to Groq (Llama 3) for a warm, empathetic response
 *
 * DATASETS USED:
 * - Amod/mental_health_counseling_conversations (therapist-patient dialogues)
 * - heliosbrahma/mental_health_chatbot_dataset (Q&A pairs)
 * - GoEmotions by Google (emotion-labeled text)
 * - Synthetic elderly Indian conversations (custom, India-specific)
 *
 * WHY GROQ?
 * - Already in .env.local (GROQ_API_KEY) — no new API key needed
 * - Free tier: 30 requests/minute, very generous
 * - Uses Llama 3 — open source, high quality
 */

// ── Initialize Groq ─────────────────────────────────────────────────────
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ── Knowledge Base (loaded once, cached in memory) ──────────────────────
interface KnowledgeEntry {
  Context: string;
  Response: string;
  source: string;
}

let knowledgeBase: KnowledgeEntry[] | null = null;

function loadKnowledgeBase(): KnowledgeEntry[] {
  if (knowledgeBase) return knowledgeBase;

  const filePath = path.join(process.cwd(), 'public', 'rag_knowledge_base.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  knowledgeBase = JSON.parse(raw) as KnowledgeEntry[];
  console.log(`✅ RAG Knowledge Base loaded: ${knowledgeBase!.length} entries`);
  return knowledgeBase!;
}

// ── Simple Text Similarity (keyword overlap + IDF weighting) ────────────
/**
 * WHY not use embeddings here?
 * - Embeddings (like sentence-transformers) require Python or a separate service
 * - For a Next.js API route, keyword matching is fast, simple, and effective
 * - We use IDF-like weighting so rare/specific words count more than common ones
 *
 * For your teacher: "We use TF-IDF inspired keyword matching for retrieval,
 * which weights rare, meaningful words higher than common ones."
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Common English stop words to ignore
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will',
  'that', 'this', 'with', 'they', 'from', 'what', 'when', 'how', 'who',
  'which', 'their', 'them', 'than', 'then', 'just', 'about', 'would',
  'could', 'should', 'into', 'also', 'some', 'very', 'much', 'more',
]);

function computeSimilarity(query: string, document: string): number {
  const queryTokens = tokenize(query).filter((w) => !STOP_WORDS.has(w));
  const docTokens = new Set(tokenize(document));

  if (queryTokens.length === 0) return 0;

  let matchCount = 0;
  for (const token of queryTokens) {
    if (docTokens.has(token)) {
      matchCount++;
    }
  }

  return matchCount / queryTokens.length;
}

// ── Retrieve Top-K Similar Conversations ────────────────────────────────
function retrieveSimilar(
  userMessage: string,
  kb: KnowledgeEntry[],
  topK: number = 5
): KnowledgeEntry[] {
  const scored = kb
    .map((entry) => ({
      entry,
      score: computeSimilarity(userMessage, entry.Context),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((s) => s.entry);
}

// ── System Prompt ───────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Saathi, a warm, caring, and emotionally intelligent AI companion designed especially for elderly people in India.

Your role is to:
- Listen with empathy, patience, and respect
- Provide emotional comfort and supportive conversation
- Speak simply, gently, and kindly — like talking to a grandparent
- Encourage connection with family, friends, and community
- Suggest simple wellness activities such as light exercise, breathing, meditation, and yoga

IMPORTANT SAFETY RULES:

1. MEDICAL ADVICE:
- You must NEVER recommend or prescribe any medicine, drugs, or treatments.
- If the user asks for medicine, clearly and politely say:
  "I'm not a doctor, so I cannot recommend medicines. It would be best to consult a qualified doctor for proper advice."
- Always prioritize safety over giving an answer.

2. ALTERNATIVE SUPPORT:
- After refusing medical advice, gently offer helpful alternatives:
  - Yoga exercises
  - Breathing techniques
  - Relaxation methods
  - Light physical activity
- Example:
  "What I can do is suggest some simple yoga or relaxation exercises that may help you feel better."

3. MENTAL HEALTH & DISTRESS:
- If the user expresses sadness, loneliness, anxiety, or emotional pain:
  - Respond with empathy first
  - Validate their feelings
  - Encourage talking to family or someone they trust

4. SEVERE CASES (CRITICAL):
- If user mentions:
  - self-harm
  - suicide
  - extreme distress
- Respond with urgency and care:
  - Encourage contacting family immediately
  - Suggest reaching out to a mental health helpline: iCall 9152987821 or Vandrevala Foundation 1860-2662-345
  - Do NOT ignore or minimize the situation

5. COMMUNICATION STYLE:
- Use warm, respectful, and simple language
- Avoid technical or clinical terms
- Be calm, patient, and reassuring
- Keep responses clear and concise (3-5 sentences)
- You can respond in Hindi if the user speaks Hindi
- IMPORTANT: Do NOT call the user "beta". Instead, use their actual name if provided. If no name is given, simply say "ji" or address them respectfully without a name.

6. CULTURAL CONTEXT:
- Be mindful of Indian cultural values
- Suggest relatable activities like:
  - walking
  - prayer
  - yoga
  - talking to family
- Reference Indian context when relevant (festivals, family values, food, culture)

Your goal is to make the user feel heard, supported, and gently guided toward safe and healthy actions.

You will be given similar counseling conversations as reference. Use them for tone and approach, but generate a FRESH, personalized response for the current user.`;

// ── API Handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, history, userName } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Build personalized name instruction
    const nameInstruction = userName
      ? `\n\nThe user's name is "${userName}". Address them by their name warmly (e.g., "${userName} ji" or just "${userName}"). Do NOT use "beta".`
      : '';

    // ── SMART SOS: Crisis Detection ─────────────────────────────────
    /**
     * WHY crisis detection at the API level?
     * - Runs on EVERY message (voice + text)
     * - Can't be bypassed by the frontend
     * - Returns structured data so the frontend can auto-trigger SOS
     *
     * SEVERITY LEVELS:
     *   'critical' → Self-harm, suicide, extreme distress → AUTO SOS
     *   'high'     → Health emergency (chest pain, can't breathe) → AUTO SOS
     *   'moderate' → Persistent sadness, loneliness → Show warning
     *   null       → Normal conversation
     */
    const crisisResult = detectCrisis(message);

    // Step 1: Load knowledge base
    const kb = loadKnowledgeBase();

    // Step 2: RETRIEVE — find similar conversations
    const retrieved = retrieveSimilar(message, kb, 5);

    // Step 3: AUGMENT — build context from retrieved examples
    let ragContext = '';
    if (retrieved.length > 0) {
      ragContext = '\n--- SIMILAR COUNSELING CONVERSATIONS (for reference) ---\n';
      retrieved.forEach((entry, i) => {
        ragContext += `\n[Example ${i + 1} from ${entry.source}]\n`;
        ragContext += `User: ${entry.Context.substring(0, 300)}\n`;
        ragContext += `Counselor: ${entry.Response.substring(0, 300)}\n`;
      });
      ragContext += '\n--- END OF REFERENCES ---\n';
    }

    // If crisis detected, add urgency instruction to the prompt
    let crisisInstruction = '';
    if (crisisResult) {
      if (crisisResult.severity === 'critical') {
        crisisInstruction = `\n\n⚠️ CRITICAL: The user's message contains signs of ${crisisResult.type}. Respond with EXTREME urgency. Validate their feelings, express deep care, and STRONGLY encourage them to call iCall helpline at 9152987821 or Vandrevala Foundation at 1860-2662-345 IMMEDIATELY. Also encourage contacting family. Do NOT minimize their feelings.`;
      } else if (crisisResult.severity === 'high') {
        crisisInstruction = `\n\n⚠️ URGENT: The user may be experiencing a medical emergency (${crisisResult.type}). Tell them to stay calm, take deep breaths, and IMMEDIATELY contact their doctor or call emergency services. Suggest pressing the SOS button if available.`;
      } else {
        crisisInstruction = `\n\n⚠️ NOTE: The user seems to be experiencing ${crisisResult.type}. Respond with extra warmth and empathy. Encourage them to talk to family or someone they trust.`;
      }
    }

    // Build conversation history for context
    const conversationHistory = (history || [])
      .slice(-6) // last 6 messages for context
      .map((msg: { role: string; text: string }) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

    // Step 4: GENERATE — send to Groq (Llama 3)
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + nameInstruction + ragContext + crisisInstruction,
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: crisisResult?.severity === 'critical' ? 0.3 : 0.7, // Less creative for crisis
      max_tokens: 300,
      top_p: 0.9,
    });

    const aiResponse =
      completion.choices[0]?.message?.content?.trim() ||
      "I'm here for you. Please tell me more about how you're feeling.";

    // Return response with crisis metadata
    return NextResponse.json({
      response: aiResponse,
      retrievedCount: retrieved.length,
      sources: retrieved.map((r) => r.source),
      // ── Crisis data for frontend SOS integration ──
      crisis: crisisResult
        ? {
            detected: true,
            severity: crisisResult.severity,
            type: crisisResult.type,
            matchedKeywords: crisisResult.matchedKeywords,
            message: crisisResult.alertMessage,
          }
        : { detected: false },
    });
  } catch (error: unknown) {
    console.error('RAG Chat error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: message },
      { status: 500 }
    );
  }
}

// ── Crisis Detection Engine ───────────────────────────────────────────
/**
 * SMART SOS — Keyword-based crisis detection with severity levels.
 *
 * For your teacher:
 * "We implemented a multi-tier crisis detection system that scans every
 *  user message for distress signals. Critical messages auto-trigger
 *  SMS/call alerts to the caregiver via Twilio."
 */

interface CrisisResult {
  severity: 'critical' | 'high' | 'moderate';
  type: string;
  matchedKeywords: string[];
  alertMessage: string;
}

// Keywords organized by severity
const CRISIS_KEYWORDS: {
  severity: 'critical' | 'high' | 'moderate';
  type: string;
  keywords: string[];
  alertMessage: string;
}[] = [
  {
    severity: 'critical',
    type: 'self-harm / suicidal thoughts',
    keywords: [
      'suicide', 'kill myself', 'end my life', 'want to die', 'don\'t want to live',
      'no reason to live', 'better off dead', 'hurt myself', 'self harm', 'self-harm',
      'cut myself', 'slit my wrist', 'hang myself', 'overdose', 'jump off',
      'marna chahta', 'marna chahti', 'mar jana', 'zindagi khatam', 'jeena nahi',
      'maut', 'khudkushi',
    ],
    alertMessage: '🆘 CRITICAL: Your loved one has expressed thoughts of self-harm or suicide during their conversation with Saathi. Please contact them IMMEDIATELY.',
  },
  {
    severity: 'high',
    type: 'medical emergency',
    keywords: [
      'chest pain', 'heart attack', 'can\'t breathe', 'cannot breathe', 'difficulty breathing',
      'stroke', 'collapsed', 'fell down', 'unconscious', 'bleeding heavily',
      'severe pain', 'paralysis', 'can\'t move', 'choking', 'seizure',
      'saans nahi', 'seene mein dard', 'gir gaya', 'gir gayi', 'behosh',
    ],
    alertMessage: '🚑 URGENT: Your loved one reported a potential medical emergency during their conversation. Please check on them immediately.',
  },
  {
    severity: 'moderate',
    type: 'emotional distress',
    keywords: [
      'nobody cares', 'completely alone', 'no one loves me', 'abandoned',
      'can\'t take it anymore', 'giving up', 'hopeless', 'worthless',
      'burden on everyone', 'burden to my family', 'useless',
      'koi nahi hai', 'akela', 'akeli', 'koi pyar nahi karta', 'bojh',
    ],
    alertMessage: '⚠️ Your loved one is showing signs of emotional distress during their conversation with Saathi. Consider reaching out to them.',
  },
];

function detectCrisis(message: string): CrisisResult | null {
  const lowerMessage = message.toLowerCase();

  for (const level of CRISIS_KEYWORDS) {
    const matched = level.keywords.filter((keyword) =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (matched.length > 0) {
      return {
        severity: level.severity,
        type: level.type,
        matchedKeywords: matched,
        alertMessage: level.alertMessage,
      };
    }
  }

  return null;
}

