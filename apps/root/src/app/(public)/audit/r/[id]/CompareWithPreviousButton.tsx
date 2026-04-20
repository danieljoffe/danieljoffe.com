'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompareArrows } from 'lucide-react';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';

interface CompareWithPreviousButtonProps {
  scanId: string;
}

interface PreviousScanResponse {
  previous: { id: string } | null;
}

export default function CompareWithPreviousButton({
  scanId,
}: CompareWithPreviousButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/previous/${scanId}`);
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const data = (await res.json()) as PreviousScanResponse;
      if (!data.previous) {
        toast({
          variant: 'info',
          title: 'No prior scan to compare',
          description:
            'This is the only scan on record for this URL and device.',
        });
        return;
      }
      router.push(`/audit/compare?auditA=${data.previous.id}&auditB=${scanId}`);
    } catch {
      toast({
        variant: 'error',
        title: 'Failed to load prior scan',
        description: 'Please try again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      name='compare-with-previous'
      variant='bare'
      disabled={loading}
      onClick={handleClick}
      aria-label='Compare with previous scan'
      className='inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors'
    >
      <GitCompareArrows className='size-4' aria-hidden='true' />
      {loading ? 'Loading...' : 'Compare'}
    </Button>
  );
}
