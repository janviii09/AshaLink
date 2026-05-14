import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/sentiment
 * 
 * HYBRID Sentiment Analysis — NLP Cloud + Crisis Keywords
 * 
 * This endpoint uses TWO complementary approaches:
 * 
 * 1. NLP Cloud Sentiment API (primary scorer):
 *    - Uses a fine-tuned DistilBERT model hosted on NLP Cloud
 *    - Returns sentiment labels (POSITIVE, NEGATIVE, NEUTRAL) with confidence scores
 *    - Much more accurate than word-level AFINN scoring for real conversations
 *    - Understands context, negation, and nuance
 * 
 * 2. Custom Keyword/Pattern Analysis (elderly-specific safety net):
 *    - Detects specific life situations like loneliness, missing family, health issues
 *    - Uses pattern matching to identify concerning phrases
 *    - Returns structured "concerns" that caregivers can act on
 *    - CRISIS override: suicide/self-harm keywords force score to 0.5-1.0
 * 
 * WHY this hybrid approach?
 *    - NLP Cloud gives accurate sentiment scoring from a trained model
 *    - Keyword patterns catch elderly-specific concerns that generic models miss
 *    - Crisis keywords act as a hard safety floor that can NEVER be overridden
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ─── Concern Categories ─────────────────────────────────────────────────
// Each category has:
//   - label: human-readable name for the concern
//   - emoji: visual indicator for the caregiver UI
//   - patterns: array of lowercase phrases to match against
//   - message: what to tell the caregiver if this concern is detected

interface ConcernCategory {
    label: string;
    emoji: string;
    patterns: string[];
    message: string;
}

const CONCERN_CATEGORIES: ConcernCategory[] = [
    {
        label: 'Loneliness & Isolation',
        emoji: '😔',
        patterns: [
            'nobody visits', 'no one visits', 'all alone', 'so alone', 'feel alone',
            'feeling alone', 'nobody cares', 'no one cares', 'nobody talks to me',
            'no one to talk', 'lonely', 'loneliness', 'isolated', 'by myself',
            'no friends', 'no company', 'empty house', 'sit alone', 'eat alone',
            'nobody comes', 'forgotten', 'no one remembers', 'they forgot about me',
            'abandoned', 'left alone', 'no visitors', 'no calls',
        ],
        message: 'Your loved one may be experiencing loneliness or feelings of isolation.',
    },
    {
        label: 'Missing Family',
        emoji: '💔',
        patterns: [
            'miss my son', 'miss my daughter', 'miss my children', 'miss my family',
            'miss my grandchildren', 'miss my wife', 'miss my husband', 'miss my partner',
            'wish they would visit', 'wish they would call', 'wish they were here',
            'want to see them', 'haven\'t seen them', 'long time since',
            'they don\'t call', 'they never visit', 'they don\'t come',
            'when will they come', 'nobody called', 'miss them so much',
            'remember when we', 'used to visit', 'they used to come',
        ],
        message: 'Your loved one is missing family members and expressing a desire for contact.',
    },
    {
        label: 'Arguments & Conflict',
        emoji: '😤',
        patterns: [
            'had a fight', 'argument', 'they shouted', 'shouted at me', 'yelled at me',
            'angry at me', 'upset with me', 'scolded me', 'we argued', 'disagreement',
            'not talking to', 'stopped talking', 'they are angry', 'conflict',
            'harsh words', 'said hurtful', 'insulted', 'disrespected', 'rude to me',
            'they don\'t listen', 'don\'t respect me', 'treated badly',
            'they blame me', 'always my fault',
        ],
        message: 'Your loved one seems to be experiencing interpersonal conflict or tension.',
    },
    {
        label: 'Health Concerns',
        emoji: '🏥',
        patterns: [
            'feeling pain', 'in pain', 'can\'t sleep', 'not sleeping', 'insomnia',
            'feeling weak', 'feel weak', 'dizzy', 'dizziness', 'headache',
            'not eating', 'can\'t eat', 'lost appetite', 'no appetite',
            'breathing problem', 'hard to breathe', 'chest pain', 'body ache',
            'fell down', 'i fell', 'stumbled', 'lost balance', 'feeling sick',
            'not feeling well', 'feeling unwell', 'medicine not working',
            'forgot medicine', 'can\'t walk properly', 'eyes hurting', 'can\'t see well',
        ],
        message: 'Your loved one has mentioned physical health concerns that may need attention.',
    },
    {
        label: 'Emotional Decline',
        emoji: '⚠️',
        patterns: [
            'tired of everything', 'what\'s the point', 'don\'t want to go on',
            'no purpose', 'meaningless', 'hopeless', 'give up', 'giving up',
            'don\'t care anymore', 'nothing matters', 'waste of time',
            'burden', 'i am a burden', 'better off without me', 'no reason to live',
            'wish i could just', 'tired of living', 'end it', 'not worth it',
            'nobody needs me', 'useless', 'worthless', 'can\'t take it anymore',
            'suicide', 'kill myself', 'want to die', 'end my life', 'self harm',
            'self-harm', 'hurt myself', 'don\'t want to live', 'wish i was dead',
            'want to end', 'take my life', 'feeling suicidal', 'feeling to suicide',
            'want to suicide', 'wanna die', 'wanna suicide', 'jump off', 'jump from',
            'jumping from', 'jumping off', 'jump out', 'jump down',
            'hang myself', 'overdose', 'slit', 'cut myself', 'no point living',
        ],
        message: '⚠️ URGENT: Your loved one is showing signs of serious emotional distress. Please reach out immediately.',
    },
    {
        label: 'Fear & Anxiety',
        emoji: '😰',
        patterns: [
            'scared', 'afraid', 'frightened', 'worried', 'anxious', 'anxiety',
            'nervous', 'panic', 'what if something happens', 'fear',
            'can\'t stop thinking', 'overthinking', 'restless', 'uneasy',
            'something bad', 'bad feeling', 'terrified', 'trouble sleeping',
            'nightmares', 'bad dreams', 'keep thinking about',
        ],
        message: 'Your loved one appears to be experiencing fear or anxiety.',
    },
    {
        label: 'Financial Worry',
        emoji: '💰',
        patterns: [
            'money problem', 'can\'t afford', 'too expensive', 'no money',
            'financial', 'bills', 'rent', 'medicine cost', 'costly',
            'savings running out', 'pension', 'not enough money', 'broke',
            'debt', 'expenses', 'prices going up', 'can\'t pay',
        ],
        message: 'Your loved one has expressed concerns about financial matters.',
    },
];

// ─── CRITICAL CRISIS KEYWORDS ─────────────────────────────────────────
// These keywords indicate an IMMEDIATE safety risk. When detected, the
// score is forced to the lowest range (0.5–1.5) regardless of any other
// scoring. This list must be kept tight — false positives here are
// less dangerous than false negatives.
const CRISIS_KEYWORDS: string[] = [
    'suicide', 'kill myself', 'want to die', 'end my life', 'take my life',
    'want to suicide', 'wanna die', 'wanna suicide', 'feeling suicidal',
    'feeling to suicide', 'don\'t want to live', 'wish i was dead',
    'no reason to live', 'better off without me', 'better off dead',
    'hang myself', 'overdose', 'jump off', 'jump from', 'jumping from',
    'jumping off', 'jump out', 'jump down', 'cut myself', 'slit my',
    'hurt myself', 'self harm', 'self-harm', 'end it all', 'tired of living',
    'no point living', 'can\'t go on', 'i give up on life',
];

// ─── Positive Indicators ─────────────────────────────────────────────
// We also track positive patterns to give a balanced picture
const POSITIVE_PATTERNS = [
    'happy', 'grateful', 'thankful', 'enjoyed', 'wonderful', 'beautiful',
    'lovely', 'blessed', 'great day', 'feeling good', 'feel great',
    'had fun', 'laughed', 'smiling', 'cheerful', 'content', 'peaceful',
    'relaxed', 'good mood', 'excited', 'looking forward', 'love',
    'appreciate', 'kind', 'helped me', 'visited me', 'called me',
    'spent time', 'played with', 'cooked together', 'went out',
];

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Classify the overall sentiment label based on the normalized score
 */
function classifySentiment(score: number): string {
    if (score >= 7.5) return 'happy';
    if (score >= 5.5) return 'neutral';
    if (score >= 3.5) return 'sad';
    if (score >= 1.5) return 'distressed';
    return 'crisis'; // 0.5–1.5 — immediate danger
}

/**
 * Check for elderly-specific concerns using pattern matching
 */
function detectConcerns(textLower: string): { label: string; emoji: string; message: string }[] {
    const detected: { label: string; emoji: string; message: string }[] = [];

    for (const category of CONCERN_CATEGORIES) {
        const matched = category.patterns.some(pattern => textLower.includes(pattern));
        if (matched) {
            detected.push({
                label: category.label,
                emoji: category.emoji,
                message: category.message,
            });
        }
    }

    return detected;
}

/**
 * Detect if the message contains critical crisis keywords.
 * Returns true if immediate-risk language is found.
 */
function isCrisisMessage(textLower: string): boolean {
    return CRISIS_KEYWORDS.some(keyword => textLower.includes(keyword));
}

/**
 * Check how many positive patterns are present
 */
function detectPositiveSignals(textLower: string): string[] {
    return POSITIVE_PATTERNS.filter(pattern => textLower.includes(pattern));
}

/**
 * Call Gemini to get a nuanced sentiment score and explanation.
 * Returns { score: 1-10, explanation: string }
 */
async function callGeminiSentiment(text: string): Promise<{ score: number; explanation: string } | null> {
    if (!GEMINI_API_KEY) return null;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: { temperature: 0.1 } // Low temperature for consistent scoring
        });

        const prompt = `Analyze the sentiment of this message from an elderly person in India. 
        Provide:
        1. A score from 1.0 to 10.0 (where 1.0 is extreme distress/crisis, 5.0 is neutral/lonely, and 10.0 is very happy/grateful).
        2. A one-sentence explanation of why you gave that score.

        Message: "${text}"

        Output format:
        Score: [score]
        Explanation: [explanation]`;

        // Retry logic for 429/503
        let result;
        let retries = 3;
        for (let i = 0; i < retries; i++) {
            try {
                result = await model.generateContent(prompt);
                break;
            } catch (err: any) {
                if ((err.status === 429 || err.status === 503) && i < retries - 1) {
                    console.warn(`Sentiment Gemini busy (attempt ${i + 1}), retrying...`);
                    await new Promise(r => setTimeout(r, 4000));
                    continue;
                }
                throw err;
            }
        }

        if (!result) return null;
        const responseText = result.response.text();

        const scoreMatch = responseText.match(/Score:\s*([\d.]+)/i);
        const explanationMatch = responseText.match(/Explanation:\s*(.*)/i);

        if (scoreMatch) {
            return {
                score: parseFloat(scoreMatch[1]),
                explanation: explanationMatch ? explanationMatch[1].trim() : 'Based on sentiment analysis.'
            };
        }
        return null;
    } catch (error) {
        console.error('Gemini sentiment failed:', error);
        return null;
    }
}

/**
 * Generate a human-readable explanation of the analysis
 */
function generateExplanation(
    score: number,
    sentiment: string,
    concerns: { label: string }[],
    positiveSignals: string[],
    nlpCloudUsed: boolean,
): string {
    const parts: string[] = [];

    // Mention overall tone
    if (sentiment === 'happy') {
        parts.push('The message has a positive and uplifting tone.');
    } else if (sentiment === 'neutral') {
        parts.push('The message has a neutral tone.');
    } else if (sentiment === 'sad') {
        parts.push('The message carries a somewhat negative or melancholic tone.');
    } else if (sentiment === 'crisis') {
        parts.push('⚠️ CRITICAL: The message contains language indicating serious emotional distress.');
    } else {
        parts.push('The message shows signs of emotional distress.');
    }

    // Mention the source
    if (nlpCloudUsed) {
        parts.push(`Analyzed using NLP Cloud AI model (score: ${score.toFixed(1)}/10).`);
    } else {
        parts.push('Analyzed using keyword pattern matching (NLP Cloud unavailable).');
    }

    // Mention concerns
    if (concerns.length > 0) {
        parts.push(`Concerns flagged: ${concerns.map(c => c.label).join(', ')}.`);
    }

    // Mention positive signals
    if (positiveSignals.length > 0 && positiveSignals.length > 2) {
        parts.push('Multiple positive expressions were found, suggesting good well-being.');
    }

    return parts.join(' ');
}


// ─── Main API Handler ────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const { text } = await request.json();

        if (!text || typeof text !== 'string') {
            return NextResponse.json(
                { error: 'No text provided' },
                { status: 400 }
            );
        }

        const textLower = text.toLowerCase();

        // 1. Detect elderly-specific concerns via keyword patterns
        const concerns = detectConcerns(textLower);

        // 2. Detect positive signals
        const positiveSignals = detectPositiveSignals(textLower);

        // 3. Check for CRITICAL crisis keywords FIRST
        const crisisDetected = isCrisisMessage(textLower);

        // 4. Call Gemini for AI-powered sentiment scoring
        const geminiResult = await callGeminiSentiment(text);
        const aiUsed = geminiResult !== null;

        // 5. Compute the base score
        let baseScore: number;
        let aiExplanation = '';

        if (geminiResult) {
            baseScore = geminiResult.score;
            aiExplanation = geminiResult.explanation;
        } else {
            // Fallback: simple heuristic based on keyword counts
            const posCount = positiveSignals.length;
            const negConcernCount = concerns.length;
            if (posCount > 0 && negConcernCount === 0) {
                baseScore = Math.min(10, 6 + posCount);
            } else if (negConcernCount > 0 && posCount === 0) {
                baseScore = Math.max(1, 5 - negConcernCount * 1.5);
            } else {
                baseScore = 5.5; // neutral fallback
            }
        }

        // 6. Apply crisis override and concern penalties
        let finalScore = baseScore;
        if (crisisDetected) {
            // HARD OVERRIDE: crisis language → score forced to 0.5–1.0
            const crisisHitCount = CRISIS_KEYWORDS.filter(k => textLower.includes(k)).length;
            finalScore = Math.min(finalScore, crisisHitCount >= 2 ? 0.5 : 1.5);
        } else if (concerns.length > 0) {
            // If Gemini already gave a low score, don't double-penalize too much
            // but ensure concern-heavy messages are pulled down
            const penalty = concerns.reduce((sum, c) => {
                if (c.label === 'Emotional Decline') return sum + 2.0;
                if (c.label === 'Health Concerns') return sum + 1.5;
                return sum + 1.0;
            }, 0);

            // Only apply penalty if the score isn't already low
            if (finalScore > 5) {
                finalScore = Math.max(3, finalScore - penalty);
            }
        }

        // 7. Classify
        const finalSentiment = crisisDetected ? 'crisis' : classifySentiment(finalScore);

        // 8. Generate explanation
        const explanation = aiExplanation || generateExplanation(
            finalScore,
            finalSentiment,
            concerns,
            positiveSignals,
            false,
        );

        // 9. Return the complete analysis
        return NextResponse.json({
            sentiment: finalSentiment,
            score: Math.round(finalScore * 10) / 10,
            explanation,
            concerns,
            positiveSignals,
            // Gemini raw info
            aiMetadata: geminiResult ? {
                model: 'gemini-2.5-flash',
                originalScore: geminiResult.score,
            } : null,
            mlModel: null,
        });

    } catch (error: unknown) {
        console.error('Error in sentiment analysis:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: 'Failed to analyze sentiment', details: message },
            { status: 500 }
        );
    }
}
