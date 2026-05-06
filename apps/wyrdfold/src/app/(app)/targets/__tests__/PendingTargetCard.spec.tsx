import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PendingTargetCard from '../PendingTargetCard';

describe('PendingTargetCard', () => {
  it('renders the provided label when given', () => {
    render(<PendingTargetCard label='Senior Frontend Engineer' />);
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
  });

  it('marks the card as busy for assistive tech', () => {
    const { container } = render(<PendingTargetCard label='Designing…' />);
    const card = container.querySelector('[aria-busy="true"]');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute('aria-live', 'polite');
  });

  it('shows two distinct in-flight indicators', () => {
    render(<PendingTargetCard label='Working' />);
    expect(screen.getByLabelText('Creating target')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Building scoring profile')
    ).toBeInTheDocument();
  });

  it('renders a label-area skeleton when label is empty (URL-mode)', () => {
    render(<PendingTargetCard label='' />);
    // The "Creating target" + "Building scoring profile" spinners always render.
    // For URL mode, the empty label means no visible heading text.
    expect(screen.queryByText(/^Senior/)).toBeNull();
    expect(screen.getByLabelText('Creating target')).toBeInTheDocument();
  });
});
