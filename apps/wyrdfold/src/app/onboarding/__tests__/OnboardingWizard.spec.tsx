import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingWizard from '../OnboardingWizard';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

// Stub heavy/network-bound child steps so the wizard's dispatch logic
// is the only thing under test. Each stub renders a single button labelled
// with its step name so role queries can drive navigation.
jest.mock('../ResumeUploader', () => ({
  __esModule: true,
  default: ({
    onComplete,
    onSkip,
  }: {
    onComplete: () => void;
    onSkip: () => void;
  }) => (
    <div data-testid='resume-uploader-stub'>
      <button type='button' onClick={onComplete}>
        resume-complete
      </button>
      <button type='button' onClick={onSkip}>
        resume-skip
      </button>
    </div>
  ),
}));

jest.mock('../JobUrlInput', () => ({
  __esModule: true,
  default: ({
    onComplete,
    onSkip,
  }: {
    onComplete: (data?: { postingId: string; title: string | null }) => void;
    onSkip: () => void;
  }) => (
    <div data-testid='job-url-input-stub'>
      <button
        type='button'
        onClick={() => onComplete({ postingId: 'p1', title: 'Eng' })}
      >
        job-complete
      </button>
      <button type='button' onClick={onSkip}>
        job-skip
      </button>
    </div>
  ),
}));

jest.mock('../TargetSuggestions', () => ({
  __esModule: true,
  default: ({
    onComplete,
    onSkip,
  }: {
    onComplete: () => void;
    onSkip: () => void;
  }) => (
    <div data-testid='target-suggestions-stub'>
      <button type='button' onClick={onComplete}>
        targets-complete
      </button>
      <button type='button' onClick={onSkip}>
        targets-skip
      </button>
    </div>
  ),
}));

jest.mock('../IdentityStep', () => ({
  __esModule: true,
  default: ({
    onComplete,
    onSkip,
  }: {
    onComplete: () => void;
    onSkip: () => void;
  }) => (
    <div data-testid='identity-step-stub'>
      <button type='button' onClick={onComplete}>
        identity-complete
      </button>
      <button type='button' onClick={onSkip}>
        identity-skip
      </button>
    </div>
  ),
}));

jest.mock('../CompletionScreen', () => ({
  __esModule: true,
  default: () => <div data-testid='completion-screen-stub'>completion</div>,
}));

jest.mock('../../_components/ConversationChat', () => ({
  __esModule: true,
  default: ({
    onComplete,
    onSkip,
  }: {
    onComplete: () => void;
    onSkip: () => void;
  }) => (
    <div data-testid='conversation-chat-stub'>
      <button type='button' onClick={onComplete}>
        chat-complete
      </button>
      <button type='button' onClick={onSkip}>
        chat-skip
      </button>
    </div>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OnboardingWizard — initial state', () => {
  it('renders the path chooser with the welcome heading', () => {
    render(<OnboardingWizard />);

    expect(
      screen.getByRole('heading', { level: 1, name: /welcome to wyrdfold/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/how would you like to get started\?/i)
    ).toBeInTheDocument();
  });

  it('does not render a progress bar on the path chooser step', () => {
    render(<OnboardingWizard />);
    // ProgressBar renders role=progressbar — should be absent before path is picked
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('navigates to /targets when the user clicks Skip for now', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(mockPush).toHaveBeenCalledWith('/targets');
  });
});

describe('OnboardingWizard — Path A (resume + role)', () => {
  it('dispatches to IdentityStep after selecting Path A', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(
      screen.getByRole('button', {
        name: /i have a resume and a role in mind/i,
      })
    );

    expect(screen.getByTestId('identity-step-stub')).toBeInTheDocument();
  });

  it('shows a progress bar on Path A non-completion steps', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(
      screen.getByRole('button', {
        name: /i have a resume and a role in mind/i,
      })
    );

    // Path A has 6 steps; identity is index 1. ProgressBar: Math.round((2/6)*100) = 33.
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-valuenow', '33');
  });

  it('advances through identity -> upload-resume -> add-job -> pick-targets -> completion', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(
      screen.getByRole('button', {
        name: /i have a resume and a role in mind/i,
      })
    );

    // Step 1: identity -> next
    await user.click(screen.getByRole('button', { name: 'identity-complete' }));
    expect(screen.getByTestId('resume-uploader-stub')).toBeInTheDocument();

    // Step 2: upload-resume -> next
    await user.click(screen.getByRole('button', { name: 'resume-complete' }));
    expect(screen.getByTestId('job-url-input-stub')).toBeInTheDocument();

    // Step 3: add-job -> next
    await user.click(screen.getByRole('button', { name: 'job-complete' }));
    expect(screen.getByTestId('target-suggestions-stub')).toBeInTheDocument();

    // Step 4: pick-targets -> next
    await user.click(screen.getByRole('button', { name: 'targets-complete' }));
    expect(screen.getByTestId('completion-screen-stub')).toBeInTheDocument();
  });

  it('hides the progress bar on the completion step', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(
      screen.getByRole('button', {
        name: /i have a resume and a role in mind/i,
      })
    );
    await user.click(screen.getByRole('button', { name: 'identity-complete' }));
    await user.click(screen.getByRole('button', { name: 'resume-complete' }));
    await user.click(screen.getByRole('button', { name: 'job-complete' }));
    await user.click(screen.getByRole('button', { name: 'targets-complete' }));

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

describe('OnboardingWizard — Path B (resume only)', () => {
  it('dispatches to IdentityStep and shows a progress bar', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(
      screen.getByRole('button', {
        name: /i have a resume but i'm exploring roles/i,
      })
    );

    expect(screen.getByTestId('identity-step-stub')).toBeInTheDocument();
    // Path B has 5 steps; identity is index 1. ProgressBar: Math.round((2/5)*100) = 40.
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-valuenow', '40');
  });

  it('skips the add-job step and goes directly to pick-targets', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(
      screen.getByRole('button', {
        name: /i have a resume but i'm exploring roles/i,
      })
    );
    await user.click(screen.getByRole('button', { name: 'identity-complete' }));
    await user.click(screen.getByRole('button', { name: 'resume-complete' }));

    expect(screen.getByTestId('target-suggestions-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('job-url-input-stub')).not.toBeInTheDocument();
  });
});

describe('OnboardingWizard — Path C (conversation)', () => {
  it('dispatches to IdentityStep after selecting Path C', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(
      screen.getByRole('button', { name: /i'm not sure where to start/i })
    );

    expect(screen.getByTestId('identity-step-stub')).toBeInTheDocument();
  });

  it('advances from identity -> conversation -> pick-targets -> completion', async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(
      screen.getByRole('button', { name: /i'm not sure where to start/i })
    );

    await user.click(screen.getByRole('button', { name: 'identity-complete' }));
    expect(screen.getByTestId('conversation-chat-stub')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'chat-complete' }));
    expect(screen.getByTestId('target-suggestions-stub')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'targets-complete' }));
    expect(screen.getByTestId('completion-screen-stub')).toBeInTheDocument();
  });
});
