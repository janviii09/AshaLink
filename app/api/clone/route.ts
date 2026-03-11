import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file') as Blob;
    const voiceName = formData.get('name') as string || "User Clone";

    // Prepare the multipart/form-data for ElevenLabs
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('name', voiceName);
    elevenLabsFormData.append('files', audioFile, 'sample.wav');
    elevenLabsFormData.append('description', 'Created via AshaLink frontend');

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': "sk_86c5f03cc259a199ebed40087e50806015582b63997eab40", // Use process.env in production!
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ voiceId: data.voice_id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}