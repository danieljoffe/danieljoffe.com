'use client';

import { FileText, Search, MessageCircle } from 'lucide-react';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import type { OnboardingPath } from './OnboardingWizard';

interface PathChooserProps {
  onSelect: (path: OnboardingPath) => void;
  onSkip: () => void;
}

const paths: {
  id: OnboardingPath;
  icon: typeof FileText;
  title: string;
  description: string;
}[] = [
  {
    id: 'A',
    icon: FileText,
    title: 'I have a resume and a role in mind',
    description:
      'Upload your resume and paste a job URL to get a tailored resume right away.',
  },
  {
    id: 'B',
    icon: Search,
    title: "I have a resume but I'm exploring roles",
    description:
      'Upload your resume and browse suggested job targets based on your experience.',
  },
  {
    id: 'C',
    icon: MessageCircle,
    title: "I'm not sure where to start",
    description:
      "Answer a few questions and we'll build your master document from scratch.",
  },
];

export default function PathChooser({ onSelect, onSkip }: PathChooserProps) {
  return (
    <div className='flex flex-col gap-4'>
      {paths.map(({ id, icon: Icon, title, description }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className='text-left'
          aria-label={title}
        >
          <Card className='transition-colors hover:border-brand-500 cursor-pointer'>
            <div className='flex items-start gap-4'>
              <div className='rounded-lg bg-surface-tertiary p-3'>
                <Icon className='size-5 text-text-secondary' aria-hidden />
              </div>
              <div className='flex-1'>
                <Heading variant='cardTitle' as='h2'>
                  {title}
                </Heading>
                <Text variant='caption' className='mt-1 text-text-secondary'>
                  {description}
                </Text>
              </div>
            </div>
          </Card>
        </button>
      ))}

      <div className='mt-4 text-center'>
        <Button
          name='onboarding-skip'
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
