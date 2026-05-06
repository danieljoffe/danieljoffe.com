import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import StatusIndicator from '../StatusIndicator';
import { JOB_STATUSES, formatStatus } from '../types';

describe('StatusIndicator', () => {
  it('renders a known status with its formatted label', () => {
    render(<StatusIndicator status='resume_draft' />);
    expect(screen.getByText('resume draft')).toBeInTheDocument();
  });

  it('renders the bare status text for unknown statuses', () => {
    render(<StatusIndicator status='mystery' />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });

  it('renders one indicator per known JOB_STATUS', () => {
    for (const status of JOB_STATUSES) {
      const { unmount } = render(<StatusIndicator status={status} />);
      expect(screen.getByText(formatStatus(status))).toBeInTheDocument();
      unmount();
    }
  });
});
