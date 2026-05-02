'use client';

import { useState, useCallback, useEffect, useRef, useId } from 'react';
import { Send } from 'lucide-react';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Alert } from '@danieljoffe.com/shared-ui/Alert';
import { Textarea } from '@danieljoffe.com/shared-ui/Textarea';
import Button from '@/components/Button';

interface ConversationChatProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export default function ConversationChat({
  onComplete,
  onSkip,
}: ConversationChatProps) {
  const idPrefix = useId();
  const msgCountRef = useRef(0);
  function nextMsgId(): string {
    return `${idPrefix}-msg-${++msgCountRef.current}`;
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, sending]);

  // Fetch initial probe question
  useEffect(() => {
    let cancelled = false;

    async function fetchProbe() {
      try {
        const res = await fetch(
          '/api/career/experience/conversation/next-probe'
        );
        if (!res.ok) throw new Error('Failed to load question');
        const data = (await res.json()) as { question: string };
        if (!cancelled) {
          setMessages([
            { id: nextMsgId(), role: 'assistant', content: data.question },
          ]);
        }
      } catch {
        if (!cancelled)
          setError('Could not start conversation. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProbe();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInput('');
    setError(null);
    setSending(true);
    setMessages(prev => [
      ...prev,
      { id: nextMsgId(), role: 'user', content: trimmed },
    ]);

    try {
      const res = await fetch('/api/career/experience/conversation/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_type: 'onboarding',
          content: trimmed,
          skipped: false,
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = (await res.json()) as {
        assistant_message: string;
        done: boolean;
      };

      setMessages(prev => [
        ...prev,
        { id: nextMsgId(), role: 'assistant', content: data.assistant_message },
      ]);

      if (data.done) {
        // Derive master doc from conversation
        setDeriving(true);
        const deriveRes = await fetch('/api/career/experience/derive', {
          method: 'POST',
        });
        if (!deriveRes.ok) throw new Error('Failed to build master document');
        setDeriving(false);

        setTimeout(onComplete, 800);
      }
    } catch (err) {
      setDeriving(false);
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.'
      );
    } finally {
      setSending(false);
    }
  }, [input, sending, onComplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSkipQuestion = useCallback(async () => {
    if (sending) return;

    setError(null);
    setSending(true);

    try {
      const res = await fetch('/api/career/experience/conversation/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_type: 'onboarding',
          content: '',
          skipped: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to skip question');

      const data = (await res.json()) as {
        assistant_message: string;
        done: boolean;
      };

      setMessages(prev => [
        ...prev,
        { id: nextMsgId(), role: 'assistant', content: data.assistant_message },
      ]);

      if (data.done) {
        setDeriving(true);
        const deriveRes = await fetch('/api/career/experience/derive', {
          method: 'POST',
        });
        if (!deriveRes.ok) throw new Error('Failed to build master document');
        setDeriving(false);
        setTimeout(onComplete, 800);
      }
    } catch (err) {
      setDeriving(false);
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.'
      );
    } finally {
      setSending(false);
    }
  }, [sending, onComplete]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='text-center'>
        <Heading variant='cardTitle' as='h2'>
          Let&apos;s build your profile
        </Heading>
        <Text variant='caption' className='mt-1 text-text-secondary'>
          Answer a few questions about your experience. Skip any you&apos;d
          rather not answer.
        </Text>
      </div>

      {/* Messages area */}
      <Card
        padding='none'
        className='flex h-[400px] flex-col'
        aria-label='Conversation'
      >
        <div ref={scrollRef} className='flex-1 overflow-y-auto p-4'>
          <div role='log' aria-live='polite' className='flex flex-col gap-3'>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={
                  msg.role === 'assistant'
                    ? 'flex justify-start'
                    : 'flex justify-end'
                }
              >
                <div
                  className={[
                    'max-w-[80%] rounded-lg px-4 py-2.5 text-sm',
                    msg.role === 'assistant'
                      ? 'bg-surface-tertiary text-text-primary'
                      : 'bg-brand-500 text-white',
                  ].join(' ')}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {(loading || sending) && (
              <div className='flex justify-start'>
                <div className='rounded-lg bg-surface-tertiary px-4 py-2.5'>
                  <Spinner size='sm' aria-label='Thinking' />
                </div>
              </div>
            )}

            {deriving && (
              <div className='flex justify-start'>
                <div className='flex items-center gap-2 rounded-lg bg-surface-tertiary px-4 py-2.5 text-sm text-text-secondary'>
                  <Spinner size='sm' aria-label='Building master document' />
                  Building your master document...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className='border-t border-border p-3'>
          <div className='flex gap-2'>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Type your answer...'
              disabled={loading || sending || deriving}
              rows={2}
              className='flex-1 resize-none'
              aria-label='Your response'
              data-sentry-mask
            />
            <div className='flex flex-col gap-1'>
              <Button
                name='onboarding-chat-send'
                variant='primary'
                size='sm'
                iconOnly
                onClick={handleSend}
                disabled={!input.trim() || loading || sending || deriving}
                aria-label='Send message'
              >
                <Send className='size-4' />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {error && <Alert variant='error'>{error}</Alert>}

      <div className='flex items-center justify-between'>
        <Button
          name='onboarding-skip-question'
          variant='outline'
          size='sm'
          onClick={handleSkipQuestion}
          disabled={loading || sending || deriving}
        >
          Skip this question
        </Button>
        <Button
          name='onboarding-skip-conversation'
          variant='ghost'
          size='sm'
          onClick={onSkip}
          disabled={sending || deriving}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
