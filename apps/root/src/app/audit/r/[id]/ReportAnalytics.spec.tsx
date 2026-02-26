import { render } from '@testing-library/react';
import ReportAnalytics from './ReportAnalytics';

jest.mock('@/lib/analytics', () => ({
  analytics: { auditScanCompleted: jest.fn() },
}));

import { analytics } from '@/lib/analytics';

const mockedAnalytics = analytics as jest.Mocked<typeof analytics>;

describe('ReportAnalytics', () => {
  beforeEach(() => {
    mockedAnalytics.auditScanCompleted.mockClear();
  });

  it('fires audit_scan_completed on mount', () => {
    render(<ReportAnalytics scanId='scan-123' grade='B' />);
    expect(mockedAnalytics.auditScanCompleted).toHaveBeenCalledWith(
      'scan-123',
      'B'
    );
  });

  it('renders nothing visible', () => {
    const { container } = render(
      <ReportAnalytics scanId='scan-123' grade='A' />
    );
    expect(container.innerHTML).toBe('');
  });

  it('does not re-fire when props are stable', () => {
    const { rerender } = render(
      <ReportAnalytics scanId='scan-123' grade='C' />
    );
    rerender(<ReportAnalytics scanId='scan-123' grade='C' />);
    expect(mockedAnalytics.auditScanCompleted).toHaveBeenCalledTimes(1);
  });
});
