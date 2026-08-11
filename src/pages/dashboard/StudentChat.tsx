import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { apiJson } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  sender: 'staff' | 'student';
  message: string;
  created_at: string;
}

interface Counselor {
  id: string;
  full_name: string;
  avatar_url?: string;
  is_online?: boolean;
}

export default function StudentChat() {
  const { user } = useAuth();
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchCounselorAndMessages = async () => {
    try {
      const cRes = await apiJson<any>('/api/assigned-counselor', {}, true);
      if (cRes.error) throw new Error(cRes.error);
      setCounselor(cRes as Counselor);

      const mRes = await apiJson<any>(`/api/messages?otherUserId=${cRes.id}`, {}, true);
      if (mRes.error) throw new Error(mRes.error);
      setMessages(mRes as Message[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounselorAndMessages();
    
    // Simple polling for new messages every 10 seconds
    const interval = setInterval(() => {
      if (counselor?.id) {
        apiJson<any>(`/api/messages?otherUserId=${counselor.id}`, {}, true).then((res) => {
          if (!res.error) setMessages(res as Message[]);
        });
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [counselor?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !counselor) return;

    setSending(true);
    try {
      const res = await apiJson<any>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          content: newMessage
        })
      }, true);
      if (res.error) throw new Error(res.error);
      setMessages(prev => [...prev, res as Message]);
      setNewMessage('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <p className="text-sm opacity-60">Connecting to your counselor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold mb-2">Could not connect</h3>
        <p className="text-sm opacity-60 max-w-md">{error}</p>
        <button onClick={() => { setLoading(true); setError(null); fetchCounselorAndMessages(); }} className="mt-6 zn-cta px-6 py-2 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[850px] relative overflow-hidden rounded-3xl border border-white/10 dark:border-white/5 shadow-2xl bg-white dark:bg-[#0B0F19] transition-all duration-300">
      
      {/* Decorative Background Blur */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="relative px-6 py-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/30">
              {counselor?.full_name?.charAt(0) || 'C'}
            </div>
            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${counselor?.is_online !== false ? 'bg-green-500' : 'bg-slate-400'} border-2 border-white dark:border-slate-900 rounded-full`}></div>
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">{counselor?.full_name}</h2>
            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-500 dark:text-orange-400">
              <span className={`w-1.5 h-1.5 rounded-full ${counselor?.is_online !== false ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
              {counselor?.is_online !== false ? 'Online Now' : 'Offline'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw className="w-4 h-4" onClick={() => fetchCounselorAndMessages()} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-transparent relative z-0 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
            <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Start the Conversation</h3>
            <p className="text-sm max-w-sm leading-relaxed">
              Send a message to start chatting with {counselor?.full_name}. They are here to help you with your admission process!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === 'student';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                <div className={`group flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm transition-all hover:shadow-md ${
                    isMe 
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm' 
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}>
                    {msg.message}
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 relative z-10">
        <form onSubmit={handleSend} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-5 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-transparent focus:border-orange-500/50 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none"
              disabled={sending}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-14 h-14 shrink-0 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-50 disabled:hover:bg-orange-500 transition-all shadow-lg shadow-orange-500/25 active:scale-95"
          >
            {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 ml-1" />}
          </button>
        </form>
      </div>
    </div>
  );
}
