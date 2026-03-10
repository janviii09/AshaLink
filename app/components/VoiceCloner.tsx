'use client';
import { useState, useRef } from 'react';

export function VoiceCloner({ onCloneComplete }: { onCloneComplete: (id: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    audioChunks.current = [];
    mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('name', "Family Member");
      setLoading(true);
      const res = await fetch('/api/clone', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.voiceId) onCloneComplete(data.voiceId);
      setLoading(false);
    };
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  return (
    <div className="flex flex-col items-center">
      <button 
        onClick={isRecording ? () => mediaRecorder.current?.stop() : startRecording}
        disabled={loading}
        className={`w-32 h-32 rounded-full text-white font-bold transition-all shadow-lg ${
          isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {loading ? "..." : isRecording ? "STOP" : "RECORD"}
      </button>
      <p className="mt-4 text-slate-500">Record a loved one speaking for 30 seconds.</p>
    </div>
  );
}