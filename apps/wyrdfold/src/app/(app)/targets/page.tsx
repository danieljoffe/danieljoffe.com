import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import Button from '@/components/Button';
import { fetchJsonFromWyrdfoldAPI } from '@/lib/api/proxy';
import { hasProse, type ProseResponse } from '../profile/types';
import TargetsList from './TargetsList';
import type { UserTargetWithTarget } from './types';

export const metadata: Metadata = {
  title: 'Targets',
};

export default function FittedTargetsPage() {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='hero' as='h1'>
          Targets
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Role profiles you score new jobs against
        </Text>
      </div>
      <Suspense fallback={<TargetsCardsSkeleton />}>
        <TargetsLoader />
      </Suspense>
    </div>
  );
}

async function TargetsLoader() {
  // Target creation depends on having an experience profile — the API
  // uses it to derive the scoring profile. Fetch both in parallel so we
  // can short-circuit to the onboarding CTA when no prose doc exists,
  // sparing the user a dead-end submit that just toasts an error.
  const [targetsRes, proseRes] = await Promise.all([
    fetchJsonFromWyrdfoldAPI<{ targets: UserTargetWithTarget[] }>(
      '/targets/mine'
    ),
    fetchJsonFromWyrdfoldAPI<ProseResponse>('/experience/prose'),
  ]);
  const initialTargets = targetsRes?.targets ?? [];
  // ``/experience/prose`` returns ``{prose: null}`` when empty and the
  // bare ``ProseDoc`` when populated — ``hasProse`` is the type guard
  // that handles both.
  const hasProfile = proseRes != null && hasProse(proseRes);

  if (!hasProfile && initialTargets.length === 0) {
    return <NoProfileZeroState />;
  }

  return <TargetsList initialTargets={initialTargets} />;
}

function NoProfileZeroState() {
  return (
    <Card>
      <CardContent className='flex flex-col items-center gap-4 py-12'>
        <Sparkles className='size-12 text-text-tertiary' aria-hidden />
        <Text variant='body' as='p' className='text-center max-w-md'>
          Build your profile first — we use it to derive each target's scoring
          profile, so targets can't be created until there's prose to draw from.
        </Text>
        <div className='flex items-center gap-3'>
          <Button
            name='targets-go-profile'
            variant='primary'
            size='sm'
            as='link'
            href='/profile'
          >
            <span>Set up profile</span>
            <ArrowRight className='size-4' aria-hidden />
          </Button>
          <Button
            name='targets-start-onboarding'
            variant='outline'
            size='sm'
            as='link'
            href='/onboarding'
          >
            <Sparkles className='size-4' aria-hidden />
            <span>Start with AI</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TargetsCardsSkeleton() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading targets'>
      <div className='flex justify-end'>
        <Skeleton variant='rectangular' width={36} height={36} />
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding='none'>
            <CardContent className='flex flex-col gap-2.5 p-4'>
              <Skeleton width='70%' size='sm' />
              <hr className='-mx-4 border-border' />
              <Skeleton variant='text' lines={3} />
              <hr className='-mx-4 border-border' />
              <div className='flex justify-end'>
                <Skeleton width={60} size='sm' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
