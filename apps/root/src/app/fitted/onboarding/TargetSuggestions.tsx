'use client';

import { useEffect, useState, useCallback } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Alert } from '@danieljoffe.com/shared-ui/Alert';
import Button from '@/components/Button';

interface TargetSuggestionsProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OptimizedSkill {
  name: string;
  proficiency: string;
}

export default function TargetSuggestions({
  onComplete,
  onSkip,
}: TargetSuggestionsProps) {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSkills() {
      try {
        const res = await fetch('/api/career/experience/optimized');
        if (!res.ok) {
          // No master doc yet — that's fine, show generic message
          setSkills([]);
          return;
        }
        const data = (await res.json()) as {
          payload?: { skills?: OptimizedSkill[] };
        };
        if (!cancelled && data.payload?.skills) {
          setSkills(
            data.payload.skills.slice(0, 8).map((s: OptimizedSkill) => s.name)
          );
        }
      } catch {
        if (!cancelled) setError('Could not load your profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSkills();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGoToTargets = useCallback(() => {
    onComplete();
  }, [onComplete]);

  if (loading) {
    return (
      <div className='flex flex-col items-center gap-4 py-12'>
        <Spinner size='lg' aria-label='Loading suggestions' />
        <Text variant='body' className='text-text-secondary'>
          Analyzing your experience...
        </Text>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='text-center'>
        <Heading variant='cardTitle' as='h2'>
          Set up your job targets
        </Heading>
        <Text variant='caption' className='mt-1 text-text-secondary'>
          Targets define the types of roles you&apos;re looking for. Create one
          to start tracking jobs.
        </Text>
      </div>

      {skills.length > 0 && (
        <Card padding='lg'>
          <Text variant='caption' className='mb-3 text-text-secondary'>
            Based on your experience, you might target roles involving:
          </Text>
          <div className='flex flex-wrap gap-2'>
            {skills.map(skill => (
              <span
                key={skill}
                className='rounded-full bg-surface-tertiary px-3 py-1 text-sm text-text-secondary'
              >
                {skill}
              </span>
            ))}
          </div>
        </Card>
      )}

      {error && <Alert variant='error'>{error}</Alert>}

      <Card
        padding='lg'
        className='cursor-pointer transition-colors hover:border-brand-500'
        onClick={handleGoToTargets}
        role='button'
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGoToTargets();
          }
        }}
      >
        <div className='flex items-center gap-4'>
          <div className='rounded-lg bg-surface-tertiary p-3'>
            <Target className='size-5 text-text-secondary' aria-hidden />
          </div>
          <div className='flex-1'>
            <Text variant='body' className='font-medium'>
              Create your first target
            </Text>
            <Text variant='caption' className='mt-0.5 text-text-secondary'>
              Define a role type, and we&apos;ll score and track matching jobs.
            </Text>
          </div>
          <ArrowRight className='size-5 text-text-tertiary' aria-hidden />
        </div>
      </Card>

      <div className='text-center'>
        <Button
          name='onboarding-skip-targets'
          variant='ghost'
          size='sm'
          onClick={onSkip}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
