import { NextResponse } from 'next/server';
import Sentiment from 'sentiment';

/**
 * POST /api/sentiment
 * 
 * HYBRID Sentiment Analysis — NO external API needed!
 * 
 * This endpoint uses TWO complementary approaches:
 * 
 * 1. AFINN Word-Level Scoring (via `sentiment` npm package):
 *    - Each word in the message is checked against a lexicon of ~2,500 English words
 *    - Each word has a pre-assigned score from -5 (very negative) to +5 (very positive)
 *    - Example: "happy" = +3, "terrible" = -3, "love" = +3, "hate" = -3
 *    - The final score is the sum of all word scores, normalized to a 1-10 scale
 * 
 * 2. Custom Keyword/Pattern Analysis (elderly-specific concerns):
 *    - Detects specific life situations like loneliness, missing family, health issues
 *    - Uses pattern matching to identify concerning phrases
 *    - Returns structured "concerns" that caregivers can act on
 *    - This is what makes it useful for elderly care — generic sentiment tools miss these
 * 
 * WHY not just use an LLM?
 *    - This runs entirely on the server with no API key needed for sentiment
 *    - No rate limits, no costs, no latency from external calls
 *    - The keyword patterns are specifically tuned for elderly care contexts
 *    - More transparent — you can see exactly WHY a concern was flagged
 */

// Initialize the AFINN sentiment analyzer
const sentimentAnalyzer = new Sentiment();

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
 * Normalize the AFINN score (which can range widely) to a 1-10 scale.
 * AFINN comparative score typically ranges from about -5 to +5.
 * We map it to 1-10 where 5.5 is neutral.
 */
function normalizeScore(comparative: number): number {
    // comparative is the average AFINN score per word
    // Map -5..+5 → 1..10
    const normalized = ((comparative + 5) / 10) * 9 + 1;
    return Math.min(10, Math.max(1, Math.round(normalized * 10) / 10));
}

/**
 * Classify the overall sentiment label based on the normalized score
 */
function classifySentiment(score: number): string {
    if (score >= 7.5) return 'happy';
    if (score >= 5.5) return 'neutral';
    if (score >= 3.5) return 'sad';
    return 'distressed';
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
 * Check how many positive patterns are present
 */
function detectPositiveSignals(textLower: string): string[] {
    return POSITIVE_PATTERNS.filter(pattern => textLower.includes(pattern));
}

/**
 * Generate a human-readable explanation of the analysis
 */
function generateExplanation(
    score: number,
    sentiment: string,
    concerns: { label: string }[],
    positiveSignals: string[],
    wordScores: { word: string; score: number }[]
): string {
    const parts: string[] = [];

    // Mention overall tone
    if (sentiment === 'happy') {
        parts.push('The message has a positive and uplifting tone.');
    } else if (sentiment === 'neutral') {
        parts.push('The message has a neutral tone.');
    } else if (sentiment === 'sad') {
        parts.push('The message carries a somewhat negative or melancholic tone.');
    } else {
        parts.push('The message shows signs of emotional distress.');
    }

    // Mention specific word contributions
    const negWords = wordScores.filter(w => w.score < 0).map(w => w.word);
    const posWords = wordScores.filter(w => w.score > 0).map(w => w.word);

    if (negWords.length > 0) {
        parts.push(`Negative words detected: "${negWords.slice(0, 3).join('", "')}".`);
    }
    if (posWords.length > 0) {
        parts.push(`Positive words detected: "${posWords.slice(0, 3).join('", "')}".`);
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

        // 1. AFINN word-level analysis
        //    The sentiment package returns:
        //    - score: total score (sum of all word scores)
        //    - comparative: average score per word (normalized)
        //    - tokens: all words in the text
        //    - words: words that had a sentiment score
        //    - positive: words with positive scores
        //    - negative: words with negative scores
        const afinnResult = sentimentAnalyzer.analyze(text);

        // 2. Normalize to 1-10 scale
        const normalizedScore = normalizeScore(afinnResult.comparative);

        // 3. Classify overall sentiment
        const sentimentLabel = classifySentiment(normalizedScore);

        // 4. Detect elderly-specific concerns via keyword patterns
        const textLower = text.toLowerCase();
        const concerns = detectConcerns(textLower);

        // 5. Detect positive signals
        const positiveSignals = detectPositiveSignals(textLower);

        // 6. Build word-level score details (for transparency)
        const wordScores = afinnResult.calculation.map((calc: Record<string, number>) => {
            const word = Object.keys(calc)[0];
            return { word, score: calc[word] };
        });

        // 7. If concerns are detected, lower the score further (concerns override raw sentiment)
        //    This handles cases where someone says something neutral-sounding but concerning
        let adjustedScore = normalizedScore;
        if (concerns.length > 0) {
            // Each concern drops the score by 0.5, minimum 1
            adjustedScore = Math.max(1, normalizedScore - concerns.length * 0.5);
        }

        // Re-classify with adjusted score
        const adjustedSentiment = concerns.length > 0 ? classifySentiment(adjustedScore) : sentimentLabel;

        // 8. Generate explanation
        const explanation = generateExplanation(
            adjustedScore,
            adjustedSentiment,
            concerns,
            positiveSignals,
            wordScores
        );

        // 9. Return the complete analysis
        return NextResponse.json({
            sentiment: adjustedSentiment,
            score: adjustedScore,
            explanation,
            concerns,
            positiveSignals,
            rawAfinn: {
                score: afinnResult.score,
                comparative: afinnResult.comparative,
                positiveWords: afinnResult.positive,
                negativeWords: afinnResult.negative,
            },
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
