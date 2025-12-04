import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistantFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Cześć! Jestem Twoim asystentem weselnym. Jak mogę Ci pomóc w planowaniu idealnego ślubu?',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response (mock)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(userMessage.content),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('budżet') || input.includes('pieniądze') || input.includes('koszt')) {
      return 'Planowanie budżetu weselnego to kluczowy element. Polecam przeznaczyć około 50% na salę i catering, 15% na fotografia/wideo, 10% na muzykę, a resztę na dekoracje, kwiaty i inne szczegóły. Czy chcesz, żebym pomógł Ci z konkretną kategorią?';
    }

    if (input.includes('goście') || input.includes('lista') || input.includes('zaproszenia')) {
      return 'Lista gości to zawsze wyzwanie! Sugeruję zacząć od najbliższej rodziny, potem przyjaciół, a na końcu znajomych z pracy. Pamiętaj o ustaleniu ostatecznej daty RSVP przynajmniej 3-4 tygodnie przed weselem.';
    }

    if (input.includes('sala') || input.includes('miejsce') || input.includes('lokalizacja')) {
      return 'Wybór sali weselnej to jedna z pierwszych decyzji. Weź pod uwagę: lokalizację (blisko kościoła?), liczbę gości, styl (rustykalny, elegancki, nowoczesny?), oraz czy mają własny catering czy możesz wybrać zewnętrzny.';
    }

    if (input.includes('suknia') || input.includes('garnitur') || input.includes('strój')) {
      return 'Suknia ślubna powinna być zamówiona 6-9 miesięcy przed weselem, żeby było dość czasu na przymiarki i ewentualne poprawki. Garnitur można zamówić 2-3 miesiące wcześniej. Pamiętaj o dodatkach!';
    }

    if (input.includes('kwiaty') || input.includes('dekoracje') || input.includes('bukiet')) {
      return 'Kwiaty sezonowe są nie tylko piękniejsze, ale też tańsze! Na wiosnę polecam piwonie i tulipany, latem - róże i hortensje, jesienią - dalie i astry. Czy masz już wizję kolorystyczną wesela?';
    }

    return 'Świetne pytanie! Planowanie wesela to przygoda. Mogę pomóc Ci z budżetem, listą gości, wyborem sali, dekoracjami i wieloma innymi aspektami. O czym konkretnie chciałbyś porozmawiać?';
  };

  return (
    <>
      {/* FAB Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-premium flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Sparkles className="w-6 h-6 text-white" />
        {/* Pulse animation */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gold-400"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md h-[75vh] bg-white rounded-t-3xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-stone-900">Asystent Weselny</h3>
                    <p className="text-xs text-stone-400">Powered by AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-stone-900 text-white rounded-br-md'
                          : 'bg-stone-100 text-stone-800 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm font-sans leading-relaxed">{message.content}</p>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-stone-100 text-stone-800 px-4 py-3 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-5 h-5 animate-spin text-gold-500" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Napisz wiadomość..."
                    className="flex-1 px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all font-sans text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="w-11 h-11 rounded-xl bg-stone-900 flex items-center justify-center hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistantFAB;
