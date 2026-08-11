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
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[800px] border border-orange-500/20 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-orange-500/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
            {counselor?.full_name?.charAt(0) || 'C'}
          </div>
          <div>
            <h2 className="font-bold">{counselor?.full_name}</h2>
            <p className="text-xs opacity-60">Your Assigned Counselor</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <MessageSquare className="w-12 h-12 mb-4 text-orange-500" />
            <p>Send a message to start chatting with {counselor?.full_name}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === 'student';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-orange-500 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-tl-sm shadow-sm'}`}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 zn-input bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="zn-cta px-6 py-3 flex items-center justify-center disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
