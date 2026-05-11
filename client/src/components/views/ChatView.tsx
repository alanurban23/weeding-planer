import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const QUICK_ACTIONS = [
  { label: '💍 Dodaj koszt', prompt: 'Chcę dodać koszt weselny' },
  { label: '👥 Pokaż gości', prompt: 'Pokaż mi wszystkich gości weselnych' },
  { label: '✅ Dodaj gościa', prompt: 'Chcę dodać nowego gościa' },
  { label: '💰 Budżet', prompt: 'Pokaż mi podsumowanie budżetu' },
  { label: '📋 Zadania', prompt: 'Pokaż mi listę zadań' },
  { label: '📝 Notatka', prompt: 'Chcę dodać notatkę' },
];

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: '👋 Cześć! Jestem Twoim asystentem weselnym. Możesz mi powiedzieć np.\n\n• *Dodaj koszt sala weselna 5000 zł*\n• *Potwierdź gościa Anna Kowalska*\n• *Pokaż wszystkich gości*\n• *Dodaj zadanie zamów kwiaty*\n\nCo chcesz zrobić?',
  ts: Date.now(),
};

// Simple markdown-like renderer (bold **text**, italic *text*, newlines)
function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part === '\n') return <br key={i} />;
    return <span key={i}>{part}</span>;
  });
}

const ChatView: React.FC = () => {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || isLoading) return;

    const userMsg: Message = { role: 'user', content: userText, ts: Date.now() };
    const newMessages = [...messages.filter(m => m.ts !== WELCOME_MESSAGE.ts || messages.length > 1), userMsg];
    // Keep welcome if it's the only prev message and we're replacing
    const historyMessages = messages[0] === WELCOME_MESSAGE && messages.length === 1
      ? [userMsg]
      : [...messages, userMsg];

    setMessages(historyMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyMessages
            .filter(m => m !== WELCOME_MESSAGE)
            .map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.message || '❌ Brak odpowiedzi.',
        ts: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Invalidate queries so other tabs see fresh data
      if (data.action && data.action !== 'CHAT' && data.readyToExecute) {
        queryClient.invalidateQueries({ queryKey: ['/api/costs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Błąd połączenia. Spróbuj ponownie.', ts: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    sendMessage(prompt);
  };

  const reset = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput('');
    inputRef.current?.focus();
  };

  const hasOnlyWelcome = messages.length === 1 && messages[0] === WELCOME_MESSAGE;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-serif text-base text-stone-900 leading-tight">Asystent Weselny</p>
            <p className="text-xs text-stone-400">Gemini AI · Gotowy do pomocy</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="p-2 rounded-xl hover:bg-stone-100 transition-colors"
          title="Nowa rozmowa"
        >
          <RotateCcw className="w-4 h-4 text-stone-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Quick actions – show when only welcome message */}
        {hasOnlyWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 mb-4"
          >
            {QUICK_ACTIONS.map(({ label, prompt }) => (
              <button
                key={label}
                onClick={() => handleQuickAction(prompt)}
                className="px-3 py-2 text-sm bg-white border border-stone-200 rounded-2xl hover:bg-stone-50 hover:border-stone-300 transition-all text-stone-700 shadow-sm"
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.ts}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI avatar */}
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}

              <div
                className={`max-w-[78%] px-4 py-3 rounded-3xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-stone-900 text-white rounded-br-lg'
                    : 'bg-white text-stone-800 border border-stone-100 shadow-sm rounded-bl-lg'
                }`}
              >
                {renderContent(msg.content)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-2"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-stone-100 shadow-sm rounded-3xl rounded-bl-lg px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-stone-400"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-3 pt-2 border-t border-stone-100 bg-stone-50/80 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napisz do asystenta..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-white rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 text-sm text-stone-800 placeholder-stone-400 transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-2xl bg-stone-900 flex items-center justify-center flex-shrink-0 hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
