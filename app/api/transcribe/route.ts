import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as Blob | null;

        if (!file) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: 'Groq API key is missing' }, { status: 500 });
        }

        // Groq API accepts form data in OpenAI format
        const groqFormData = new FormData();
        // Append with a filename so the API knows it's a file
        groqFormData.append('file', file, 'audio.webm');
        groqFormData.append('model', 'whisper-large-v3-turbo');
        // Optional parameters
        groqFormData.append('response_format', 'json');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: groqFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq Whisper API Error:', response.status, errorText);
            return NextResponse.json(
                { error: 'Failed to transcribe audio with Groq', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ text: data.text });
    } catch (error: any) {
        console.error('Transcription route error:', error);
        return NextResponse.json(
            { error: 'Internal server error during transcription', details: error.message || String(error) },
            { status: 500 }
        );
    }
}
