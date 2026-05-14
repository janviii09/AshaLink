'use client';

import { useState } from 'react';
import { Send, Loader2, BookOpen } from 'lucide-react';

/**
 * RagChat — Text-based Mental Health Companion (RAG-powered)
 *
 * This component provides a text chat interface that sends messages
 * to the /api/rag-chat endpoint, which uses:
 *   - 5,699 counseling conversations as a knowledge base
 *   - Groq (Llama 3) for response generation
 *
 * Works alongside HumanSathi (voice) — both share the same message log
 * via the onMessageReceived callback.
 */

interface RagChatProps {
  onMessageReceived: (role: 'user' | 'ai', text: string) => void;
  onCrisisDetected?: (crisis: { detected: boolean; severity?: string; type?: string; matchedKeywords?: string[]; message?: string }) => void;
  messages: { role: string; text: string }[];
}

export default function RagChat({ onMessageReceived, onCrisisDetected, messages }: RagChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrievedSources, setRetrievedSources] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Add user message
    onMessageReceived('user', trimmed);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/rag-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-6),
          userName: typeof window !== 'undefined' ? localStorage.getItem('elder_name') || '' : '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onMessageReceived('ai', data.response);
        setRetrievedSources(data.sources || []);

        // Pass crisis data to parent for Smart SOS
        if (data.crisis && onCrisisDetected) {
          onCrisisDetected(data.crisis);
        }
      } else {
        onMessageReceived('ai', "I'm sorry, I couldn't process that. Please try again.");
      }
    } catch {
      onMessageReceived('ai', "I'm having trouble connecting. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-[30px] shadow-2xl border-4 border-gray-50 max-w-md mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 text-white">
        <h3 className="text-xl font-bold">💬 Chat with Saathi</h3>
        <p className="text-sm opacity-80">RAG-powered mental health companion</p>
      </div>

      {/* Input Area */}
      <div className="p-5">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type how you're feeling..."
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none border-2 border-gray-200 rounded-2xl px-4 py-3 text-base focus:outline-none focus:border-green-500 transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-2xl p-4 transition-all active:scale-90 shadow-lg"
          >
            {isLoading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Send size={24} />
            )}
          </button>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium">
            <Loader2 size={16} className="animate-spin" />
            Saathi is thinking...
          </div>
        )}

        {/* Source info (for teacher demo) */}
        {retrievedSources.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <BookOpen size={12} />
              {showSources ? 'Hide' : 'Show'} RAG sources ({retrievedSources.length} docs retrieved)
            </button>
            {showSources && (
              <div className="mt-1 text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
                Sources: {retrievedSources.map((s, i) => (
                  <span key={i} className="inline-block bg-gray-200 rounded px-2 py-0.5 mr-1 mb-1">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick prompts for elderly users */}
        <div className="mt-4 flex flex-wrap gap-2">
          {['I feel lonely 😔', 'I am not feeling well 🤒', 'I had a good day! 😊'].map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="text-sm bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600 px-3 py-1.5 rounded-full transition-colors border border-gray-200"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
