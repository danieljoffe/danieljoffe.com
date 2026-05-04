'use client';

import { CheckCircle, ArrowRight } from 'lucide-react';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import Button from '@/components/Button';

export default function CompletionScreen() {
  return (
    <div className='flex flex-col items-center gap-6'>
      <Card padding='lg' className='w-full text-center'>
        <div className='flex flex-col items-center gap-4 py-4'>
          <div className='rounded-full bg-success/10 p-4'>
            <CheckCircle className='size-12 text-success' aria-hidden />
          </div>
          <div>
            <Heading variant='cardTitle' as='h2'>
              You&apos;re all set!
            </Heading>
            <Text variant='body' className='mt-2 text-text-secondary'>
              Your account is ready. Head to your targets to start tracking jobs
              and generating tailored resumes.
            </Text>
          </div>
        </div>
      </Card>

      <Button
        name='onboarding-go-to-targets'
        as='link'
        href='/targets'
        variant='primary'
        size='lg'
        className='w-full justify-center'
      >
        <span>Go to Targets</span>
        <ArrowRight className='size-4' aria-hidden />
      </Button>
    </div>
  );
}
