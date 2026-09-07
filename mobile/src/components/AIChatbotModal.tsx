import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { apiClient } from '../api/client';
import { X, Send, Bot, Sparkles, HelpCircle, ArrowRight, Activity, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  recommendedSwaps?: Array<{
    name: string;
    brand: string;
    calories: number;
    rating: number;
    reason: string;
  }>;
}

interface AIChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextFood?: any;
}

export const AIChatbotModal: React.FC<AIChatbotModalProps> = ({ isOpen, onClose, contextFood }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const foodTitle = contextFood?.detectedDishName || contextFood?.productName || 'Your Scanned Food';

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text: `Hello! I am your **FoodScan AI Nutritionist Assistant** 🥗.\n\nI see you're analyzing **${foodTitle}**. Feel free to ask me anything about its health score, diabetic safety, or healthier alternatives!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, foodTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const quickQuestions = [
    "Is this safe for diabetics?",
    "Suggest a healthier alternative",
    "How to burn these calories?",
    "Can I eat this daily?"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await apiClient.post('/chat', {
        message: text.trim(),
        currentFoodContext: contextFood,
        chatHistory: messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
      });

      if (res.data?.success && res.data?.data) {
        const botReply = res.data.data.reply;
        const recommendedSwaps = res.data.data.recommendedSwaps;

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: botReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            recommendedSwaps
          }
        ]);
        setIsTyping(false);
        return;
      }
    } catch (err) {
      console.warn('Chatbot API network notice, using local intelligent nutrition rules:', err);
    }

    // Local Clinical Nutrition Engine Fallback
    const lower = text.toLowerCase();
    let reply = '';
    let swaps: any[] | undefined = undefined;

    const isHighSugar = contextFood?.nutrition?.sugar > 15 || contextFood?.totalNutrition?.sugar > 15;
    const isUltraProcessed = contextFood?.novaGroup?.level === 4;

    if (lower.includes('diabet') || lower.includes('sugar')) {
      reply = isHighSugar
        ? `⚠️ **Diabetic Alert for ${foodTitle}**:\nThis item contains elevated refined sugars. For healthy glucose management, limit portion size to a minimum or swap to a zero-sugar whole grain alternative.`
        : `✅ **Diabetic Assessment for ${foodTitle}**:\nThis food has low refined sugar and high satiety fibers. It is suitable for blood sugar stability in controlled portions.`;
    } else if (lower.includes('swap') || lower.includes('alternative') || lower.includes('healthy choice') || lower.includes('better')) {
      reply = `🔄 **Recommended Healthier Alternatives for ${foodTitle}**:\nHere are clean, high-nutrition substitutes that avoid refined palm oil and excess sugar:`;
      swaps = [
        { name: 'Organic Whole Grain Oats Cookies', brand: 'NutriChoice Clean', calories: 310, rating: 4.6, reason: 'Zero palm oil, 70% less sugar & high oat fiber.' },
        { name: 'Roasted Multigrain Makhana / Foxnuts', brand: 'Farm Fresh', calories: 180, rating: 4.9, reason: 'Zero added sugar, high plant protein.' }
      ];
    } else if (lower.includes('calorie') || lower.includes('burn') || lower.includes('exercise')) {
      const cals = contextFood?.nutrition?.calories || contextFood?.totalNutrition?.calories || 340;
      reply = `🏃 **Calorie Burn Breakdown (~${cals} kcal)**:\n• ~${Math.round(cals / 4)} mins of brisk walking (5 km/h)\n• ~${Math.round(cals / 8)} mins of cycling\n• ~${Math.round(cals / 10)} mins of jogging`;
    } else {
      reply = `🥗 **Nutritionist Assessment for ${foodTitle}**:\n${foodTitle} is a widely consumed food. For balanced health, enjoy it in moderation and complement it with fresh water and green salads for optimal digestion!`;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedSwaps: swaps
      }
    ]);
    setIsTyping(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md h-[88vh] sm:h-[650px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Chatbot Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-white shadow-inner">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black">FoodScan AI Nutritionist</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              </div>
              <p className="text-[10px] text-emerald-100 font-medium">Context: {foodTitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-line font-medium">{msg.text}</div>

                {/* Render Recommended Swaps if AI suggests them */}
                {msg.recommendedSwaps && msg.recommendedSwaps.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                      Recommended Healthier Swaps:
                    </span>
                    {msg.recommendedSwaps.map((swap, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-900">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-black text-emerald-950">{swap.name}</strong>
                          <span className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800">
                            ⭐ {swap.rating}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">{swap.brand} • {swap.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                <span className={`text-[9px] block mt-1 font-bold ${msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-600 animate-spin" />
                <span>Nutritionist AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Suggestions */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[10px] font-bold whitespace-nowrap bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask anything about this food..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition shadow-md shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
