import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TargetDetailSkeleton from '../TargetDetailSkeleton';

describe('TargetDetailSkeleton', () => {
  it('renders the loading region with an accessible label', () => {
    const { container } = render(<TargetDetailSkeleton />);
    expect(screen.getByLabelText(/loading target/i)).toBeInTheDocument();
    // Smoke — root element is present.
    expect(container.firstChild).not.toBeNull();
  });

  it('does not expose any interactive controls (pure skeleton)', () => {
    render(<TargetDetailSkeleton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
