import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  Send,
  Mic,
  Volume2,
  Trash2,
  Sparkles,
  User,
  HeartPulse,
  FileText,
  Apple,
  Brain,
  ShieldCheck
} from 'lucide-react';

export const AiAssistantView: React.FC = () => {
  const { chatMessages, addChatMessage, clearChat, user, showToast, getAuthToken } = useApp();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputText).trim();
    if (!query) return;

    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      await addChatMessage({
        sender: 'user',
        text: query,
      });

      const token = await getAuthToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: query,
          history: chatMessages,
          userProfile: user,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Assistant failed to respond');
      }

      if (data.reply) {
        await addChatMessage({
          sender: 'assistant',
          text: data.reply,
        });
      }
    } catch (err: any) {
      showToast(err?.message || 'Error connecting to AI Assistant', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showToast('Speech recognition not supported in this browser. Please type your prompt.', 'info');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      showToast('Text-to-speech audio output unavailable in this browser.', 'info');
    }
  };

  const quickPrompts = [
    {
      label: 'Symptom Guidance',
      icon: <HeartPulse className="w-3.5 h-3.5 text-red-400" />,
      text: 'I have a mild headache, tiredness, and slight neck tension. What could be the cause and remedies?',
    },
    {
      label: 'Diet Plan',
      icon: <Apple className="w-3.5 h-3.5 text-emerald-400" />,
      text: 'Recommend a 1-day Mediterranean meal plan suitable for managing blood pressure.',
    },
    {
      label: 'Lab Report Explanation',
      icon: <FileText className="w-3.5 h-3.5 text-amber-400" />,
      text: 'Explain what Fasting Blood Glucose of 98 mg/dL and HbA1c of 5.4% mean for metabolic health.',
    },
    {
      label: 'Mental Wellness',
      icon: <Brain className="w-3.5 h-3.5 text-cyan-400" />,
      text: 'Provide 3 quick diaphragmatic breathing techniques to manage stress.',
    },
  ];

  return (
    <div className="space-y-4 pb-24 text-white">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#181818] via-[#201d12] to-[#181818] border border-amber-500/30 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
              GEMINI CLINICAL AI
            </span>
            <h1 className="text-2xl font-black text-white">AI Health Companion</h1>
            <p className="text-xs text-neutral-300">
              24/7 Medical Q&A, Symptom Triage, Diet & Lab Report Insights
            </p>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/10 transition"
          title="Clear Conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(p.text)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-neutral-800 border border-white/10 text-xs font-semibold text-neutral-200 whitespace-nowrap transition shadow-md"
          >
            {p.icon}
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Conversation Box */}
      <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 min-h-[420px] max-h-[550px] overflow-y-auto space-y-4 shadow-2xl">
        {chatMessages.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Bot className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-sm font-bold text-white">
              Hello {user.name || 'Patient'}! Ask your HealthCare+ AI Companion anything.
            </p>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Your encrypted conversation history is synced to Cloud Firestore. Select a quick prompt above or type a question below.
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs leading-relaxed space-y-2 relative group ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-neutral-900 text-neutral-200 border border-white/5 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                <div className="flex items-center justify-between pt-1 text-[9px] text-neutral-400 border-t border-white/10">
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.sender === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.text)}
                      className="p-1 rounded hover:bg-neutral-800 text-amber-400 flex items-center gap-1 font-semibold"
                    >
                      <Volume2 className="w-3 h-3" /> Read Aloud
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-amber-400 font-semibold p-3 bg-neutral-900 rounded-xl w-fit border border-amber-500/20">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Gemini AI formulating clinical guidance...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div className="p-3 rounded-2xl bg-[#181818] border border-white/10 flex items-center gap-2 shadow-xl">
        <button
          onClick={handleVoiceInput}
          className={`p-3 rounded-xl border transition ${
            isListening
              ? 'bg-red-500 text-white border-red-400 animate-pulse'
              : 'bg-neutral-900 hover:bg-neutral-800 text-amber-400 border-white/10'
          }`}
          title="Voice Input"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask medical questions, diet advice, or symptom triage..."
          className="flex-1 bg-transparent px-2 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>AI Medical Guidance for Educational Reference • Emergency Call 911</span>
      </div>
    </div>
  );
};
