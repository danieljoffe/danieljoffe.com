'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Copy-to-clipboard button for MDX code blocks. Rendered inside the relative
 * wrapper around each `<pre>` (see mdx-components `pre`); on click it reads the
 * sibling `<code>` text content and copies it. Hidden until the block is
 * hovered or the button is focused, so it stays out of the way for readers but
 * is reachable by keyboard.
 */
export function CopyCodeButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const code =
      e.currentTarget.parentElement?.querySelector('code')?.textContent ?? '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail silently.
    }
  };

  return (
    <button
      type='button'
      onClick={handleCopy}
      aria-label={copied ? 'Code copied' : 'Copy code'}
      className={cn(
        'absolute right-2 top-2 inline-flex items-center justify-center rounded-md',
        'border border-border bg-surface/80 p-1.5 text-text-secondary backdrop-blur',
        'opacity-0 transition-opacity hover:text-text-primary',
        'group-hover:opacity-100 focus-visible:opacity-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
      )}
    >
      {copied ? (
        <Check className='h-4 w-4 text-success' aria-hidden='true' />
      ) : (
        <Copy className='h-4 w-4' aria-hidden='true' />
      )}
    </button>
  );
}
