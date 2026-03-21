'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { useToast } from '@/state/Toast/ToastProvider';

interface ShareButtonProps {
  scanId: string;
}

export default function ShareButton({ scanId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      analytics.auditReportShared(scanId);
      setCopied(true);
      toast({ variant: 'success', title: 'Link copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'error',
        title: 'Failed to copy link',
        description: 'Please copy the URL manually.',
      });
    }
  };

  // Hide if clipboard API is unavailable (e.g. non-HTTPS)
  if (typeof window !== 'undefined' && !navigator.clipboard) {
    return null;
  }

  return (
    <button
      onClick={handleShare}
      className='inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors'
      aria-label={copied ? 'Link copied' : 'Copy report link'}
    >
      {copied ? (
        <>
          <Check className='size-4' aria-hidden='true' />
          Copied!
        </>
      ) : (
        <>
          <Share2 className='size-4' aria-hidden='true' />
          Share
        </>
      )}
    </button>
  );
}
