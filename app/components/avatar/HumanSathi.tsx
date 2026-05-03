'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';

/**
 * HumanSathi — RAG-Powered Voice AI Companion
 *
 * FLOW:
 *   1. User presses "START TALKING" → browser Web Speech API listens
 *   2. Speech is transcribed to text (free, no API needed)
 *   3. Text is sent to /api/rag-chat (RAG brain — 5,699 counseling docs + Groq/Llama 3)
 *   4. RAG response is sent to /api/tts (ElevenLabs — speaks it aloud)
 *   5. Avatar shows "Speaking" animation while audio plays
 *
 * BEFORE (old flow):
 *   User speaks → ElevenLabs agent (generic brain) → ElevenLabs speaks
 *
 * AFTER (new flow):
 *   User speaks → Web Speech API → RAG (5,699 docs) → Groq/Llama 3 → ElevenLabs TTS
 *
 * WHY THIS IS BETTER:
 *   - The AI brain is now trained on real mental health counseling data
 *   - Responses are grounded in actual therapist conversations
 *   - ElevenLabs is still used for natural-sounding voice output
 */

interface HumanSathiProps {
  onMessageReceived: (role: 'user' | 'ai', text: string) => void;
  onCrisisDetected?: (crisis: { detected: boolean; severity?: string; type?: string; matchedKeywords?: string[]; message?: string }) => void;
}

// Store conversation history for context
const conversationHistory: { role: string; text: string }[] = [];

export default function HumanSathi({ onMessageReceived, onCrisisDetected }: HumanSathiProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [interimText, setInterimText] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Setup Web Speech API ──────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // English (India) — also picks up Hindi-English mix

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
      }

      if (finalTranscript) {
        setInterimText('');
        handleUserMessage(finalTranscript.trim());
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status === 'listening') {
        setStatus('idle');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setStatus('idle');

      // Show user-friendly error for mic permission issues
      if (event.error === 'not-allowed') {
        setMicError('Microphone access was denied. Please allow microphone permission in your browser settings, then refresh the page.');
      } else if (event.error === 'no-speech') {
        // User didn't say anything — not an error, just try again
        setMicError(null);
      } else {
        setMicError(`Microphone error: ${event.error}. Please try again.`);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle User Message (RAG + TTS pipeline) ─────────────────────
  const handleUserMessage = async (text: string) => {
    // 1. Show user message in transcript
    onMessageReceived('user', text);
    conversationHistory.push({ role: 'user', text });

    setIsProcessing(true);
    setStatus('thinking');

    try {
      // 2. Send to RAG API for intelligent response
      const ragResponse = await fetch('/api/rag-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: conversationHistory.slice(-6),
          userName: typeof window !== 'undefined' ? localStorage.getItem('elder_name') || '' : '',
        }),
      });

      if (!ragResponse.ok) throw new Error('RAG failed');

      const ragData = await ragResponse.json();
      const aiText = ragData.response;

      // 3. Show AI message in transcript
      onMessageReceived('ai', aiText);
      conversationHistory.push({ role: 'ai', text: aiText });

      // 3b. Check for crisis (Smart SOS)
      if (ragData.crisis && onCrisisDetected) {
        onCrisisDetected(ragData.crisis);
      }

      // 4. Convert to speech via ElevenLabs TTS
      setStatus('speaking');
      setIsSpeaking(true);

      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });

      if (ttsResponse.ok) {
        const audioBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          setStatus('idle');
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          setStatus('idle');
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } else {
        // TTS failed — still show the text response, just don't speak
        setIsSpeaking(false);
        setStatus('idle');
      }
    } catch (error) {
      console.error('Pipeline error:', error);
      onMessageReceived('ai', "I'm sorry, I had trouble processing that. Please try again.");
      setStatus('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Start/Stop Listening ──────────────────────────────────────────
  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome.');
      return;
    }

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsListening(true);
    setStatus('listening');
    setInterimText('');
    setMicError(null); // Clear any previous error
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    if (!isProcessing) {
      setStatus('idle');
    }
  };

  // ── Status Labels ─────────────────────────────────────────────────
  const statusConfig = {
    idle: { label: 'Hello!', subtitle: 'Press the big button below to talk to me.', color: 'bg-gray-300' },
    listening: { label: 'I am listening...', subtitle: interimText || 'Speak now, I can hear you.', color: 'bg-green-500' },
    thinking: { label: 'Let me think...', subtitle: 'Finding the best response from my knowledge...', color: 'bg-yellow-500' },
    speaking: { label: 'Speaking...', subtitle: 'Listen to my response.', color: 'bg-blue-500' },
  };

  const currentStatus = statusConfig[status];
  const isActive = status !== 'idle';

  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[40px] shadow-2xl border-4 border-gray-50 max-w-md mx-auto">

      {/* Visual Avatar for Elderly Users */}
      <div className="relative mb-10">
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
        )}
        <div className={`w-64 h-64 rounded-full border-8 transition-all duration-700 shadow-inner overflow-hidden ${
          isActive ? 'border-blue-500 scale-105' : 'border-gray-100'
        }`}>
          <img
            src="/elderly-saathi.png" // Use a friendly, smiling elder advisor image
            alt="Support Companion"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Animated Sound Wave when AI speaks */}
        {isSpeaking && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 items-center bg-blue-600 px-4 py-2 rounded-full shadow-lg">
             <Volume2 className="text-white w-5 h-5 animate-pulse" />
             <span className="text-white font-bold text-sm uppercase tracking-widest">Speaking</span>
          </div>
        )}

        {/* Thinking indicator */}
        {isProcessing && !isSpeaking && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 items-center bg-yellow-500 px-4 py-2 rounded-full shadow-lg">
             <Loader2 className="text-white w-5 h-5 animate-spin" />
             <span className="text-white font-bold text-sm uppercase tracking-widest">Thinking</span>
          </div>
        )}
      </div>

      <div className="text-center mb-10">
        <h3 className="text-3xl font-black text-gray-900 mb-3">
          {currentStatus.label}
        </h3>
        <p className="text-xl text-gray-600 font-medium px-4">
          {currentStatus.subtitle}
        </p>

        {/* RAG badge */}
        <div className="mt-3 inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
          🧠 RAG-Powered • 5,699 counseling docs
        </div>
      </div>

      {/* Extra-Large Accessible Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className={`w-full py-8 rounded-[30px] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${
          isListening
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : isProcessing
          ? 'bg-gray-400 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isListening ? (
          <><MicOff size={40} /> Stop Talking</>
        ) : isProcessing ? (
          <><Loader2 size={40} className="animate-spin" /> Processing...</>
        ) : (
          <><Mic size={40} /> START TALKING</>
        )}
      </button>

      {/* Microphone Permission Error */}
      {micError && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-yellow-800 font-medium">🎤 {micError}</p>
          <p className="text-xs text-yellow-600 mt-1">You can still use the text chat below!</p>
        </div>
      )}

      {/* Connection Status Helper */}
      <div className="mt-6 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${currentStatus.color}`} />
        <span className="text-sm font-bold text-gray-400 uppercase">
          {status}
        </span>
      </div>
    </div>
  );
}