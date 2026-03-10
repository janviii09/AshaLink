'use client';

import { useState, useEffect, useRef } from 'react';
import HumanSathi from '@/app/components/avatar/HumanSathi';
import { Download } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO string
}

export default function AvatarPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('avatar_messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse messages from localStorage", e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('avatar_messages', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll the log to the bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewMessage = (role: 'user' | 'ai', text: string) => {
    const newMessage: Message = {
      role,
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleDownloadReport = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const relevantMessages = messages.filter(msg => new Date(msg.timestamp) >= sevenDaysAgo);

    if (relevantMessages.length === 0) {
      alert("No transcripts found for the last 7 days.");
      return;
    }

    const reportContent = relevantMessages.map(msg => {
      const date = new Date(msg.timestamp).toLocaleString();
      const speaker = msg.role === 'user' ? 'Me' : 'Companion';
      return `[${date}] ${speaker}: ${msg.text}`;
    }).join('\n\n');

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_report_7days_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-6 py-8 min-h-screen flex flex-col bg-gray-50">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-800">ApkaSaathi Avatar</h1>
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors"
        >
          <Download size={20} />
          Download 7-Day Report
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Conversation Log Section */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-gray-200 flex flex-col h-[550px]">
          <div className="p-4 border-b font-semibold text-gray-700">Live Transcript</div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-400 italic">
                Start the conversation to see the transcript...
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                  <p className="text-xs opacity-70 mb-1">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Human Avatar Section */}
        <div className="lg:col-span-1 sticky top-8">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-200">
            <HumanSathi onMessageReceived={handleNewMessage} />

          </div>
        </div>
      </div>
    </div>
  );
}