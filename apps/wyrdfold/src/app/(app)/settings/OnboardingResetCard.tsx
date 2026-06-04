'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';

/**
 * Settings card that lets a user redo the onboarding wizard.
 *
 * Clears `onboarding_completed_at` + `onboarding_current_step`
 * server-side via POST /api/profile/onboarding/reset, then redirects
 * to /onboarding. **Does not** delete prose, targets, or any other
 * profile data — only the wizard's notion of completion is reset.
 *
 * A 2-step confirm guards against accidental clicks. Plain native
 * confirm() is fine — no animation budget for a modal here, and the
 * action is reversible (the user can just finish the wizard again).
 */
export default function OnboardingResetCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleRedo = useCallback(async () => {
    // Native confirm is intentional here — the action is reversible
    // (the user can just finish the wizard again) and we don't want
    // the modal weight for this rare path.
    const confirmed = window.confirm(
      // eslint-disable-line no-alert
      'Redo onboarding? Your profile data, targets, and saved jobs ' +
        'are preserved — only the wizard restarts.'
    );
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/profile/onboarding/reset', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`Reset failed (${res.status})`);
      }
      router.push('/onboarding');
    } catch (err) {
      setSubmitting(false);
      toast({
        variant: 'error',
        title: err instanceof Error ? err.message : 'Could not redo onboarding',
      });
    }
  }, [router, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redo onboarding</CardTitle>
        <Text variant='meta' className='text-text-secondary'>
          Restart the welcome wizard. Your profile, targets, and saved jobs are
          preserved.
        </Text>
      </CardHeader>
      <CardContent>
        <Button
          name='settings-redo-onboarding'
          variant='outline'
          size='sm'
          onClick={handleRedo}
          disabled={submitting}
        >
          <RotateCcw className='size-4' aria-hidden />
          <span>{submitting ? 'Resetting…' : 'Redo onboarding'}</span>
        </Button>
      </CardContent>
    </Card>
  );
}
