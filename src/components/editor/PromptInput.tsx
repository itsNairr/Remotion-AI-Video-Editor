'use client';

import { usePromptChat } from '@/composables/usePromptChat';
import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { Loader2, Send, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface PromptInputProps {
  editor: UseVideoEditorReturn;
}

const QUICK_PROMPTS = [
  'Stitch intro_founder.mp4 to the start',
  'Add inverted negative text to the video that says Evstry make it full screen',
  'Move it to the bottom',
  'Zoom in 30% on speaker face',
  'Cut dead air from 00:04 to 00:08',
];

export const PromptInput: React.FC<PromptInputProps> = ({ editor }) => {
  const { messages, isLoading, submitPrompt } = usePromptChat(editor);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest message on new messages or loading state change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    await submitPrompt(text);
  };

  const handleQuickPrompt = async (prompt: string) => {
    setInputText(prompt);
    await submitPrompt(prompt);
  };

  return (
    <div className="flex flex-col h-full max-h-full min-h-0 bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-800/60 bg-zinc-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            Timeline Copilot (Conversational Canvas)
          </h2>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-mono">
          Gemini 3.5 Flash Lite
        </span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 overscroll-contain">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[90%] ${
              msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-xs'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-xs'
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-xs text-xs text-zinc-400 mr-auto">
            <Loader2 size={14} className="animate-spin text-emerald-400" />
            <span>Reasoning across timeline & synthesizing JSON edits...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Chips (Horizontal Scrollable) */}
      <div className="px-3 py-2 bg-zinc-900/50 border-t border-zinc-800/50 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-zinc-500 shrink-0">Ideas:</span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickPrompt(qp)}
            className="text-[11px] bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg border border-zinc-700/50 transition shrink-0 whitespace-nowrap"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Form (Pinned at bottom, Guaranteed Visible) */}
      <form onSubmit={handleSubmit} className="p-3 bg-zinc-900/95 border-t border-zinc-800/80 flex gap-2 shrink-0 z-10">
        <input
          id="prompt-input-field"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g. Add inverted negative text to the video that says Evstry make it full screen..."
          className="flex-1 bg-zinc-950 border border-zinc-700/80 hover:border-zinc-600 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40 shrink-0 cursor-pointer"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
