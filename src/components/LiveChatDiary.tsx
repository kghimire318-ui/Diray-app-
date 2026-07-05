import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mic, MicOff, Send, Shield, Sparkles, X } from 'lucide-react';

// List of mocked AI responses structured to understand and suggest solutions for user's feelings
const AI_RESPONSES = [
  "Oh, I can completely understand what you are going through. Sharing your thoughts always helps lighten the mind. Tell me, what else has been happening?",
  "You've raised a very valid point. In times like this, taking a short break and practicing self-care is truly the best step forward.",
  "I am right here to listen to you. Pour your emotions into this diary; it will surely bring you some comfort and relief.",
  "Please don't worry, things will gradually get better with time. You are incredibly strong!"
];

export default function LiveChatDiary({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! This is your secure Live Chat Diary. What's on your mind today? Tell me everything, and I'll guide you with the best suggestions.", isAi: true }
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Text-to-Speech function for AI audio response
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // Uses English voice for the English text
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAiResponse = async (userMessage: string) => {
    setIsTyping(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, previousId: interactionId })
      });
      const data = await response.json();
      
      if (data.interactionId) {
        setInteractionId(data.interactionId);
      }
      
      const replyText = data.response || "I'm sorry, I couldn't process that right now.";
      
      setMessages(prev => [...prev, { id: Date.now(), text: replyText, isAi: true }]);
      speakText(replyText);
    } catch (error) {
      console.error(error);
      const fallbackReply = "I'm having trouble connecting to the AI. Let's try again later.";
      setMessages(prev => [...prev, { id: Date.now(), text: fallbackReply, isAi: true }]);
      speakText(fallbackReply);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle message sending
  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setMessages(prev => [...prev, { id: Date.now(), text: userMessage, isAi: false }]);
    setInputText("");

    // Trigger AI process
    handleAiResponse(userMessage);
  };

  // Speech-to-Text implementation (Voice Recognition)
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice features. Please try using Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US'; // Set to capture English speech input
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setInputText(speechToText);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please allow microphone access to use voice features.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setIsListening(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.container}>
        {/* Header Section - Cleaned title replacing Gemini */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <MessageSquare size={24} color="#fff" />
            <h2 style={styles.headerTitle}>Live Chat Diary</h2>
          </div>
          <div style={styles.headerRight}>
            <Shield size={18} color="#4ade80" />
            <span style={styles.secureText}>End-to-End Encrypted</span>
            {onClose && (
              <button 
                onClick={onClose} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '10px', display: 'flex' }}
                title="Close chat"
              >
                <X size={20} color="#fff" />
              </button>
            )}
          </div>
        </header>

        {/* Chat Messages Feed */}
        <div style={styles.chatArea}>
          {messages.map((msg) => (
            <div key={msg.id} style={msg.isAi ? styles.aiRow : styles.userRow}>
              <div style={msg.isAi ? styles.aiBubble : styles.userBubble}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={styles.aiRow}>
              <div style={styles.typingBubble}>
                <Sparkles size={16} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />
                Diary is typing...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Messaging Input Area */}
        <form onSubmit={handleSendMessage} style={styles.inputArea}>
          <button
            type="button"
            onClick={toggleListening}
            style={isListening ? styles.micBtnActive : styles.micBtn}
            title="Speak your mind"
          >
            {isListening ? <MicOff size={22} color="#fff" /> : <Mic size={22} color="#4b5563" />}
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? "Listening... Speak now..." : "Type your thoughts here..."}
            disabled={isListening}
            style={styles.inputField}
          />
          
          <button type="submit" style={styles.sendBtn} disabled={!inputText.trim()}>
            <Send size={20} color="#fff" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Inline styles mirroring your layout structure
const styles: { [key: string]: React.CSSProperties } = {
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(28, 25, 23, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 50,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '700px',
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#f9fafb',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    borderRadius: '24px',
    overflow: 'hidden',
    fontFamily: 'sans-serif'
  },
  header: {
    backgroundColor: '#1f2937',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #374151'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  headerTitle: {
    color: '#ffffff',
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  secureText: {
    color: '#4ade80',
    fontSize: '12px'
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#f3f4f6'
  },
  aiRow: {
    display: 'flex',
    justifyContent: 'flex-start'
  },
  userRow: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    color: '#1f2937',
    padding: '12px 16px',
    borderRadius: '16px 16px 16px 2px',
    maxWidth: '75%',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    lineHeight: 1.5
  },
  userBubble: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '12px 16px',
    borderRadius: '16px 16px 2px 16px',
    maxWidth: '75%',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    lineHeight: 1.5
  },
  typingBubble: {
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
    padding: '10px 14px',
    borderRadius: '16px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center'
  },
  inputArea: {
    padding: '14px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  inputField: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '24px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontSize: '15px',
    backgroundColor: '#f9fafb'
  },
  micBtn: {
    backgroundColor: '#f3f4f6',
    border: 'none',
    padding: '10px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  micBtnActive: {
    backgroundColor: '#ef4444',
    border: 'none',
    padding: '10px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    border: 'none',
    padding: '10px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};
