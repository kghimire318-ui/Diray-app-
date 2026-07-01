import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatModalProps {
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error communicating with assistant.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl flex flex-col h-[600px]">
        <header className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Diary Assistant</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-400" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={cn("p-4 rounded-2xl max-w-[80%]", m.role === 'user' ? 'bg-stone-800 text-white ml-auto' : 'bg-stone-100 text-stone-800')}>
              {m.text}
            </div>
          ))}
          {isLoading && <div className="p-4 bg-stone-100 rounded-2xl text-stone-400">Assistant is thinking...</div>}
        </div>
        <footer className="p-4 border-t border-stone-100 flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-stone-100 rounded-2xl px-4 py-3"
            placeholder="Ask anything about your journal..."
          />
          <button onClick={handleSend} className="p-3 bg-stone-800 text-white rounded-2xl"><Send className="w-5 h-5" /></button>
        </footer>
      </div>
    </motion.div>
  );
};
import { cn } from '../lib/utils';
