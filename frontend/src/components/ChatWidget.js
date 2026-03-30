import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';

export default function ChatWidget() {
  const { API, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && !historyLoaded) {
      (async () => { try { const res = await axios.get(`${API}/chat/history?limit=20`, { withCredentials: true }); setMessages(res.data.map(m => ({ role: m.role, content: m.content }))); setHistoryLoaded(true); } catch (e) { console.error(e); } })();
    }
  }, [open, historyLoaded, API]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim(); setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setSending(true);
    try { 
      const res = await axios.post(`${API}/chat`, { message: msg, currentPath: location.pathname }, { withCredentials: true }); 
      
      let rawResponse = res.data.response;
      const navMatch = rawResponse.match(/\[\[NAVIGATE_TO:\s*(.*?)\]\]/);
      
      if (navMatch && navMatch[1]) {
        const route = navMatch[1].trim();
        rawResponse = rawResponse.replace(navMatch[0], '').trim();
        setTimeout(() => navigate(route), 1500); 
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: rawResponse }]); 
    }
    catch { setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response.' }]); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <>
      <button data-testid="chat-toggle-btn" onClick={() => setOpen(!open)} className={`fixed bottom-6 right-20 z-[9999] w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-lg rounded-sm ${open ? 'bg-white border border-[#E4E4E7]' : 'bg-[#002FA7] hover:bg-[#0044FF]'}`}>
        {open ? <X className="w-5 h-5 text-[#171717]" /> : <MessageSquare className="w-5 h-5 text-white" />}
      </button>
      {open && (
        <div data-testid="chat-panel" className="fixed bottom-20 right-20 z-[9999] w-[380px] max-h-[520px] border border-[#E4E4E7] bg-white flex flex-col animate-slide-in shadow-xl rounded-sm">
          <div className="px-4 py-3 border-b border-[#E4E4E7] bg-[#FAFAFA]">
            <h3 className="text-xs font-heading font-bold text-[#171717]">Discovery Assistant</h3>
            <p className="text-[10px] font-mono text-[#A1A1AA]">Ask questions about your customer data</p>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-3 max-h-[360px]">
            {messages.length === 0 && (
              <div className="text-center py-6 px-1">
                <MessageSquare className="w-8 h-8 text-[#E4E4E7] mx-auto mb-3" />
                <p className="text-[11px] font-bold text-[#171717] mb-1">Your Context-Aware Guide</p>
                <div className="space-y-2 mt-4 text-left">
                  <div className="flex items-start gap-2 bg-[#F4F4F5] p-2 rounded-sm border border-[#E4E4E7]">
                    <span className="text-[#002FA7] shrink-0">📍</span>
                    <p className="text-[10px] font-mono text-[#52525B]">I know you're currently viewing: <strong className="text-[#171717]">{location.pathname}</strong></p>
                  </div>
                  <div className="flex items-start gap-2 bg-[#F4F4F5] p-2 rounded-sm border border-[#E4E4E7]">
                    <span className="text-[#002FA7] shrink-0">🚀</span>
                    <p className="text-[10px] font-mono text-[#52525B]">I can navigate for you. Try asking: <strong className="text-[#171717]">"Take me to project ideas"</strong></p>
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-sm ${msg.role === 'user' ? 'bg-[#002FA7] text-white' : 'bg-[#F4F4F5] border border-[#E4E4E7] text-[#171717]'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="text-xs font-mono prose prose-sm max-w-none [&_p]:text-xs [&_p]:text-[#171717] [&_li]:text-xs [&_li]:text-[#171717] [&_strong]:text-[#171717] [&_code]:text-[#002FA7] [&_code]:bg-[#002FA7]/5 [&_code]:px-1"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  ) : <p className="text-xs font-mono">{msg.content}</p>}
                </div>
              </div>
            ))}
            {sending && <div className="flex justify-start"><div className="bg-[#F4F4F5] border border-[#E4E4E7] px-3 py-2 rounded-sm"><Loader2 className="w-4 h-4 text-[#A1A1AA] animate-spin" /></div></div>}
          </div>
          <div className="border-t border-[#E4E4E7] p-2">
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm">
              <input data-testid="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask about your data..." className="flex-1 bg-transparent text-xs font-mono text-[#171717] px-3 py-2.5 focus:outline-none placeholder:text-[#A1A1AA]" />
              <button data-testid="chat-send-btn" onClick={sendMessage} disabled={sending || !input.trim()} className="px-3 py-2.5 text-[#002FA7] hover:text-[#0044FF] disabled:text-[#D4D4D8] transition-colors"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
