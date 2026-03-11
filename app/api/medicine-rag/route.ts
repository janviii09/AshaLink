import { NextResponse } from 'next/server';

/**
 * POST /api/medicine-rag
 * 
 * RAG (Retrieval-Augmented Generation) endpoint for medicine queries.
 * 
 * HOW IT WORKS:
 * 1. The user's medicine list is stored in localStorage on the client side.
 * 2. When the user asks a question like "What medicine should I take in the morning?",
 *    the client sends BOTH the query AND the full medicine list to this endpoint.
 * 3. We build a "context" string from the medicine list (this is the "Retrieval" part).
 * 4. We send this context + the user's question to Groq LLM (this is the "Generation" part).
 * 5. The LLM answers ONLY based on the user's actual medicines — no hallucinated info.
 * 
 * WHY client-side storage + server-side LLM?
 * - Privacy: medicines stay in the user's browser, not in our database
 * - Simplicity: no vector database needed for this small dataset
 * - Speed: we skip the embedding/similarity step since the full list fits in one prompt
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// TypeScript interface matching the Medicine type used on the client
interface Medicine {
    id: string;
    name: string;
    dosage: string;
    timing: string[];     // e.g., ['morning', 'night']
    purpose: string;
    notes?: string;
}

export async function POST(request: Request) {
    try {
        // 1. Extract the query and medicines from the request
        const { query, medicines } = await request.json();

        if (!query) {
            return NextResponse.json(
                { error: 'No query provided' },
                { status: 400 }
            );
        }

        if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
            return NextResponse.json(
                { error: 'GROQ_API_KEY is not configured. Please add it to .env.local' },
                { status: 500 }
            );
        }

        // 2. Build the medicine context string
        //    This is the "Retrieval" part of RAG — we format the user's medicine list
        //    into a human-readable string that the LLM can understand
        const medicineList = medicines as Medicine[];
        const medicineContext = medicineList.length > 0
            ? medicineList.map((med, i) =>
                `${i + 1}. ${med.name}
   - Dosage: ${med.dosage}
   - Timing: ${med.timing.join(', ')}
   - Purpose: ${med.purpose}
   ${med.notes ? `- Notes: ${med.notes}` : ''}`
            ).join('\n\n')
            : 'No medicines have been added yet.';

        // 3. Send to Groq LLM with the context
        //    The system prompt constrains the LLM to ONLY use the provided medicine list
        //    This prevents hallucination — the LLM can't make up medicines the user doesn't take
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful health assistant for an elderly person. You speak in simple, clear language. You are warm and caring.

Here is their complete medicine list:
${medicineContext}

RULES:
- Answer questions based ONLY on the medicines listed above
- If a medicine is not in the list, say "I don't see that in your medicine list"
- Always mention the timing (morning/afternoon/evening/night) when relevant
- Use simple language — the user may be elderly
- Be reassuring and friendly
- If the list is empty, kindly suggest adding medicines first`
                    },
                    {
                        role: 'user',
                        content: query,
                    },
                ],
                temperature: 0.4,  // Slightly higher than identify for more natural responses
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Groq API error:', errorData);
            return NextResponse.json(
                { error: 'Failed to process medicine query', details: errorData },
                { status: 500 }
            );
        }

        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content || 'I could not understand that. Please try again.';

        // 4. Return the natural language answer
        return NextResponse.json({ answer });

    } catch (error: unknown) {
        console.error('Error in medicine RAG:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: 'Failed to process medicine query', details: message },
            { status: 500 }
        );
    }
}
