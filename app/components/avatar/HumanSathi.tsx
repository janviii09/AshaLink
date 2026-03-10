'use client';

import { useConversation } from '@elevenlabs/react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface HumanSathiProps {
  onMessageReceived: (role: 'user' | 'ai', text: string) => void;
}

export default function HumanSathi({ onMessageReceived }: HumanSathiProps) {
  const conversation = useConversation({
    onMessage: (message) => {
      if ('message' in message && message.source === 'ai') {
        onMessageReceived('ai', message.message as string);
      }
      if ('transcript' in message && message.source === 'user') {
        onMessageReceived('user', message.transcript as string);
      }
    },
    onError: (error) => console.error("ElevenLabs Error:", error),
  });

  const startSession = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: "agent_8501kgvwhpfcekardg6ygjdtwn37",
        connectionType: 'webrtc', 
      });
    } catch (error) {
      alert("Please allow the microphone so I can hear you.");
    }
  };

  const stopSession = async () => {
    await conversation.endSession();
  };

  const isConnected = conversation.status === 'connected';

  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[40px] shadow-2xl border-4 border-gray-50 max-w-md mx-auto">
      
      {/* Visual Avatar for Elderly Users */}
      <div className="relative mb-10">
        {isConnected && (
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
        )}
        <div className={`w-64 h-64 rounded-full border-8 transition-all duration-700 shadow-inner overflow-hidden ${
          isConnected ? 'border-blue-500 scale-105' : 'border-gray-100'
        }`}>
          <img 
            src="/elderly-saathi.png" // Use a friendly, smiling elder advisor image
            alt="Support Companion"
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Animated Sound Wave when AI speaks */}
        {conversation.isSpeaking && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 items-center bg-blue-600 px-4 py-2 rounded-full shadow-lg">
             <Volume2 className="text-white w-5 h-5 animate-pulse" />
             <span className="text-white font-bold text-sm uppercase tracking-widest">Speaking</span>
          </div>
        )}
      </div>

      <div className="text-center mb-10">
        <h3 className="text-3xl font-black text-gray-900 mb-3">
          {isConnected ? 'I am listening...' : 'Hello!'}
        </h3>
        <p className="text-xl text-gray-600 font-medium px-4">
          {isConnected 
            ? 'Tell me how you are feeling today.' 
            : 'Press the big button below to talk to me.'}
        </p>
      </div>
      
      {/* Extra-Large Accessible Button */}
      <button 
        onClick={isConnected ? stopSession : startSession}
        className={`w-full py-8 rounded-[30px] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 transition-transform active:scale-90 ${
          isConnected 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isConnected ? (
          <><MicOff size={40} /> Stop Talking</>
        ) : (
          <><Mic size={40} /> START TALKING</>
        )}
      </button>

      {/* Connection Status Helper */}
      <div className="mt-6 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm font-bold text-gray-400 uppercase">
          {conversation.status}
        </span>
      </div>
    </div>
  );
}