'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@danieljoffe.com/shared-ui/ProgressBar';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import WyrdfoldLogo from '@/components/WyrdfoldLogo';
import ConversationChat from '../_components/ConversationChat';
import PathChooser from './PathChooser';
import ResumeUploader from './ResumeUploader';
import IdentityStep from './IdentityStep';
import JobUrlInput, { type JobData } from './JobUrlInput';
import TargetSuggestions from './TargetSuggestions';
import CompletionScreen from './CompletionScreen';

export type OnboardingPath = 'A' | 'B' | 'C';

type Step =
  | 'path-chooser'
  | 'identity'
  | 'upload-resume'
  | 'add-job'
  | 'pick-targets'
  | 'conversation'
  | 'completion';

// ``identity`` runs first thing after path selection in every path.
// Capturing contact name up front prevents the mid-flow window.prompt
// from #683 (Generate Resume / Cover Letter would 400 with "No
// contact name on file" otherwise). Email auto-fills from the
// Supabase auth session; name is the only required field.
const STEPS_BY_PATH: Record<OnboardingPath, Step[]> = {
  A: [
    'path-chooser',
    'identity',
    'upload-resume',
    'add-job',
    'pick-targets',
    'completion',
  ],
  B: [
    'path-chooser',
    'identity',
    'upload-resume',
    'pick-targets',
    'completion',
  ],
  C: ['path-chooser', 'identity', 'conversation', 'pick-targets', 'completion'],
};

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('path-chooser');
  const [selectedPath, setSelectedPath] = useState<OnboardingPath | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  const steps = selectedPath ? STEPS_BY_PATH[selectedPath] : ['path-chooser'];
  const stepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  // Move focus to the new step content on transition
  useEffect(() => {
    stepRef.current?.focus();
  }, [currentStep]);

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
    router.push('/targets');
  }, [router]);

  return (
    <div className='flex min-h-screen items-center justify-center bg-bg px-4 py-12'>
      <div className='w-full max-w-2xl'>
        {/* Header */}
        <div className='mb-8 flex flex-col items-center text-center'>
          {currentStep === 'path-chooser' && (
            <WyrdfoldLogo aria-label='WyrdFold' className='mb-4 h-12 w-16' />
          )}
          <Heading variant='hero' as='h1'>
            Welcome to WyrdFold
          </Heading>
          <Text variant='body' className='mt-2 text-text-secondary'>
            {currentStep === 'path-chooser'
              ? 'How would you like to get started?'
              : `Step ${stepIndex + 1} of ${totalSteps}`}
          </Text>
          {currentStep === 'path-chooser' && (
            <Text
              variant='caption'
              className='mt-3 max-w-md text-text-tertiary'
            >
              Match scores start rough and get more accurate as you add resume
              content, target roles, and preferences.
            </Text>
          )}
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

        {/* Step content — tabIndex={-1} allows programmatic focus */}
        <div
          ref={stepRef}
          tabIndex={-1}
          aria-label={`Onboarding step: ${currentStep.replace(/-/g, ' ')}`}
          className='outline-none'
        >
          {currentStep === 'path-chooser' && (
            <PathChooser onSelect={handlePathSelect} onSkip={handleSkip} />
          )}
          {currentStep === 'identity' && (
            <IdentityStep onComplete={goNext} onSkip={handleSkip} />
          )}
          {currentStep === 'upload-resume' && (
            <ResumeUploader onComplete={goNext} onSkip={handleSkip} />
          )}
          {currentStep === 'add-job' && (
            <JobUrlInput
              onComplete={data => {
                if (data) setJobData(data);
                goNext();
              }}
              onSkip={handleSkip}
            />
          )}
          {currentStep === 'pick-targets' && (
            <TargetSuggestions
              onComplete={goNext}
              onSkip={handleSkip}
              jobData={jobData}
            />
          )}
          {currentStep === 'conversation' && (
            <ConversationChat onComplete={goNext} onSkip={handleSkip} />
          )}
          {currentStep === 'completion' && <CompletionScreen />}
        </div>
      </div>
    </div>
  );
}
