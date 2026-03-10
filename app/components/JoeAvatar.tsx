'use client';
import { useEffect, useRef, useState } from 'react';
import { useConversation } from '@11labs/react';
// Corrected: Removed VoiceType from named exports as it's often an enum or default export depending on version
import StreamingAvatar, { AvatarQuality } from '@heygen/streaming-avatar';

export default function JoeAvatar() {
  // Fix: Allow MediaStream to be null or undefined to match SDK output
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);

  const conversation = useConversation({
    onConnect: () => console.log('Joe is connected'),
    onDisconnect: () => console.log('Joe disconnected'),
  });

  const startSession = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/joe-session', { method: 'POST' });
      const { token, signedUrl } = await res.json();

      // Initialize HeyGen Avatar
      avatarRef.current = new StreamingAvatar({ token });

      // Fix: Corrected the 'voice' object structure to match the latest SDK
      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.Medium,
        avatarName: "josh_lite_20230714", 
        voice: { 
          voiceId: "agent_8501kgvwhpfcekardg6ygjdtwn37",
          // The SDK now expects ElevenLabs settings inside 'elevenlabsSettings' 
          // or handles it automatically via the ID.
        }
      });

      // Fix: The SDK mediaStream can be null initially, we handle that here
      if (avatarRef.current.mediaStream) {
        setStream(avatarRef.current.mediaStream);
      }
      
      await conversation.startSession({ signedUrl });
    } catch (error) {
      console.error("Failed to start Joe:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-3xl shadow-2xl">
      <div className="relative w-full max-w-lg aspect-video bg-black rounded-2xl overflow-hidden border-8 border-white shadow-inner">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-blue-900/10 text-center p-4">
            Joe is ready... <br/> (नमस्ते, शुरू करें पर क्लिक करें)
          </div>
        )}
      </div>

      <button
        onClick={startSession}
        disabled={loading || !!stream}
        className="mt-8 px-12 py-4 bg-orange-500 text-white text-2xl font-bold rounded-full hover:bg-orange-600 transition-all transform active:scale-95 shadow-lg disabled:bg-gray-400"
      >
        {loading ? 'कनेक्ट हो रहा है...' : 'Joe से बात करें'}
      </button>

      <p className="mt-4 text-slate-500 text-sm">Guided Mindfulness • Hindi Support</p>
    </div>
  );
}