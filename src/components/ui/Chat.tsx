import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { cn } from '../../lib/cn';
import Avatar from './Avatar';
import Button from './Button';
import Spinner from './Spinner';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
}

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1 px-3 py-2 rounded-2xl bg-[var(--ds-bg-muted)]', className)} aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--ds-text-muted)] animate-bounce"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

export function ChatBubble({
  message,
  avatarUrl,
  name,
}: {
  message: ChatMessage;
  avatarUrl?: string;
  name?: string;
}) {
  const mine = message.role === 'user';
  return (
    <div className={cn('flex gap-2.5 max-w-[90%]', mine ? 'ml-auto flex-row-reverse' : '')}>
      <Avatar
        src={avatarUrl}
        name={name || (mine ? 'You' : 'AI')}
        size="sm"
        className="mt-1"
      />
      <div
        className={cn(
          'rounded-2xl px-3.5 py-2.5 text-sm font-medium leading-relaxed shadow-[var(--ds-shadow-xs)]',
          mine
            ? 'bg-[var(--ds-brand)] text-white rounded-br-md'
            : 'bg-[var(--ds-bg-muted)] text-[var(--ds-text)] rounded-bl-md border border-[var(--ds-border)]'
        )}
      >
        {message.content}
        {message.createdAt && (
          <span className={cn('block text-[10px] mt-1 font-semibold', mine ? 'text-white/70' : 'text-[var(--ds-text-faint)]')}>
            {message.createdAt}
          </span>
        )}
      </div>
    </div>
  );
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = 'Ask about ranks, colleges, cutoffs…',
  className,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
  };
  return (
    <form onSubmit={submit} className={cn('flex items-end gap-2', className)}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={1}
        className="ds-textarea flex-1 !min-h-[44px] !py-2.5 resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit(e);
          }
        }}
        disabled={disabled}
      />
      <Button type="submit" variant="brand" size="icon" disabled={disabled || !text.trim()} aria-label="Send">
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}

export function ChatWindow({
  messages,
  onSend,
  loading,
  title = 'AI Counsellor',
  subtitle = 'MBBSWala assistant',
  emptyState,
  className,
  headerExtra,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  emptyState?: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className={cn('flex flex-col h-full min-h-[420px] rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] overflow-hidden', className)}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ds-border)] bg-[var(--ds-bg-muted)]/50">
        <span className="w-9 h-9 rounded-xl bg-[var(--ds-brand-soft)] grid place-items-center">
          <Bot className="w-4 h-4 text-[var(--ds-brand)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-[var(--ds-text)]">{title}</p>
          <p className="text-xs text-[var(--ds-text-muted)]">{subtitle}</p>
        </div>
        {headerExtra}
      </div>

      <div className="flex-1 overflow-y-auto ds-scroll p-4 space-y-4">
        {messages.length === 0 &&
          (emptyState || (
            <div className="h-full grid place-items-center text-center p-6">
              <div>
                <User className="w-8 h-8 mx-auto mb-2 text-[var(--ds-text-faint)]" />
                <p className="font-bold text-[var(--ds-text)]">Start a conversation</p>
                <p className="text-sm text-[var(--ds-text-muted)] mt-1">Ask about NEET ranks, MP cutoffs, or college shortlists.</p>
              </div>
            </div>
          ))}
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} name={m.role === 'user' ? 'You' : 'MBBSWala AI'} />
        ))}
        {loading && (
          <div className="flex gap-2 items-center">
            <Avatar name="AI" size="sm" />
            <TypingIndicator />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-[var(--ds-border)]">
        <ChatInput onSend={onSend} disabled={loading} />
        {loading && (
          <p className="text-[10px] text-[var(--ds-text-muted)] mt-2 flex items-center gap-1">
            <Spinner size={12} label="" /> Thinking…
          </p>
        )}
      </div>
    </div>
  );
}
