'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@danieljoffe.com/shared-ui/ProgressBar';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import PathChooser from './PathChooser';
import ResumeUploader from './ResumeUploader';
import JobUrlInput from './JobUrlInput';
import TargetSuggestions from './TargetSuggestions';
import ConversationChat from './ConversationChat';
import CompletionScreen from './CompletionScreen';

export type OnboardingPath = 'A' | 'B' | 'C';

type Step =
  | 'path-chooser'
  | 'upload-resume'
  | 'add-job'
  | 'pick-targets'
  | 'conversation'
  | 'completion';

const STEPS_BY_PATH: Record<OnboardingPath, Step[]> = {
  A: ['path-chooser', 'upload-resume', 'add-job', 'completion'],
  B: ['path-chooser', 'upload-resume', 'pick-targets', 'completion'],
  C: ['path-chooser', 'conversation', 'pick-targets', 'completion'],
};

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('path-chooser');
  const [selectedPath, setSelectedPath] = useState<OnboardingPath | null>(null);

  const steps = selectedPath ? STEPS_BY_PATH[selectedPath] : ['path-chooser'];
  const stepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  const goNext = useCallback(() => {
    if (!selectedPath) return;
    const stepsForPath = STEPS_BY_PATH[selectedPath];
    const idx = stepsForPath.indexOf(currentStep);
    if (idx < stepsForPath.length - 1) {
      setCurrentStep(stepsForPath[idx + 1]);
    }
  }, [selectedPath, currentStep]);

  const handlePathSelect = useCallback((path: OnboardingPath) => {
    setSelectedPath(path);
    const firstStep = STEPS_BY_PATH[path][1];
    setCurrentStep(firstStep);
  }, []);

  const handleSkip = useCallback(() => {
    router.push('/fitted');
  }, [router]);

  return (
    <div className='flex min-h-screen items-center justify-center bg-bg px-4 py-12'>
      <div className='w-full max-w-2xl'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <Heading variant='component' as='h1'>
            Welcome to Fitted
          </Heading>
          <Text variant='body' className='mt-2 text-text-secondary'>
            {currentStep === 'path-chooser'
              ? 'How would you like to get started?'
              : `Step ${stepIndex + 1} of ${totalSteps}`}
          </Text>
        </div>

        {/* Progress bar */}
        {selectedPath && currentStep !== 'completion' && (
          <div className='mb-8'>
            <ProgressBar
              value={stepIndex + 1}
              max={totalSteps}
              size='sm'
              aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}
            />
          </div>
        )}

        {/* Step content */}
        {currentStep === 'path-chooser' && (
          <PathChooser onSelect={handlePathSelect} onSkip={handleSkip} />
        )}
        {currentStep === 'upload-resume' && (
          <ResumeUploader onComplete={goNext} onSkip={handleSkip} />
        )}
        {currentStep === 'add-job' && (
          <JobUrlInput onComplete={goNext} onSkip={handleSkip} />
        )}
        {currentStep === 'pick-targets' && (
          <TargetSuggestions onComplete={goNext} onSkip={handleSkip} />
        )}
        {currentStep === 'conversation' && (
          <ConversationChat onComplete={goNext} onSkip={handleSkip} />
        )}
        {currentStep === 'completion' && <CompletionScreen />}
      </div>
    </div>
  );
}
