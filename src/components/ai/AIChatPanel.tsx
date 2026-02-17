import { useState, useRef, useEffect, type ReactElement } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { IChatMessage } from '@/hooks/useAI';

interface IAIChatPanelProps {
  messages: IChatMessage[];
  loading: boolean;
  error: string;
  onSend: (message: string) => Promise<void>;
  onClearError: () => void;
  onClearMessages: () => void;
  className?: string;
}

export const AIChatPanel = ({
  messages,
  loading,
  error,
  onSend,
  onClearError,
  onClearMessages,
  className,
}: IAIChatPanelProps): ReactElement => {
  const [inputValue, setInputValue] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;
    setInputValue('');
    await onSend(trimmed);
  };

  return (
    <Card
      className={cn(
        'flex flex-col w-full max-w-md border-slate-700 bg-slate-800/95 text-slate-100',
        className
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <h3 className='font-semibold text-slate-200'>AI Assistant</h3>
        <Button
          variant='ghost'
          size='sm'
          className='text-slate-400 hover:text-slate-200'
          onClick={onClearMessages}
        >
          Clear
        </Button>
      </CardHeader>
      <CardContent className='flex flex-col flex-1 min-h-0 p-2'>
        <div className='flex-1 overflow-y-auto min-h-[200px] max-h-[320px] space-y-2 pr-1'>
          {messages.length === 0 && !loading && (
            <p className='text-sm text-slate-500 p-2'>
              Ask to create sticky notes, shapes, frames, or arrange objects. Try &quot;Add a yellow
              sticky at 100, 100&quot; or &quot;Create a SWOT template&quot;.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg px-3 py-2 text-sm wrap-break-word',
                msg.role === 'user'
                  ? 'bg-slate-700 text-slate-100 ml-4'
                  : 'bg-slate-600/80 text-slate-100 mr-4'
              )}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className='flex items-center gap-2 text-slate-400 text-sm px-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div
            className='mt-2 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded px-2 py-1 flex items-center justify-between gap-2'
            role='alert'
          >
            <span>{error}</span>
            <Button
              variant='ghost'
              size='sm'
              className='text-red-300 shrink-0'
              onClick={onClearError}
            >
              Dismiss
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className='flex gap-2 mt-2'>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='Ask to create or edit board items...'
            disabled={loading}
            className='flex-1 border-slate-600 bg-slate-700/50 text-slate-100 placeholder:text-slate-500'
          />
          <Button
            type='submit'
            disabled={loading || !inputValue.trim()}
            size='icon'
            className='shrink-0'
          >
            {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
