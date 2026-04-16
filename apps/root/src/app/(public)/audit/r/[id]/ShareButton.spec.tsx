import { render, screen, fireEvent, act } from '@testing-library/react';
import { analytics } from '@/lib/analytics';
import ShareButton from './ShareButton';

jest.mock('@/lib/analytics', () => ({
  analytics: { auditReportShared: jest.fn() },
}));

const mockedAnalytics = analytics as jest.Mocked<typeof analytics>;

describe('ShareButton', () => {
  const writeTextMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.useFakeTimers();
    writeTextMock.mockClear();
    mockedAnalytics.auditReportShared.mockClear();
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Share button', () => {
    render(<ShareButton scanId='abc-123' />);
    expect(
      screen.getByRole('button', { name: 'Copy report link' })
    ).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('copies URL and shows Copied! state', async () => {
    render(<ShareButton scanId='abc-123' />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(writeTextMock).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Link copied' })
    ).toBeInTheDocument();
  });

  it('fires analytics event on share', async () => {
    render(<ShareButton scanId='abc-123' />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(mockedAnalytics.auditReportShared).toHaveBeenCalledWith('abc-123');
  });

  it('reverts to Share text after 2 seconds', async () => {
    render(<ShareButton scanId='abc-123' />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Share')).toBeInTheDocument();
  });
});
