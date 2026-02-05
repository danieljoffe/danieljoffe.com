import React from 'react';
import { render, screen } from '@testing-library/react';
import WhoIWorkWith from './WhoIWorkWith';

describe('WhoIWorkWith', () => {
  it('renders the section heading', () => {
    render(<WhoIWorkWith />);
    expect(
      screen.getByRole('heading', { name: /who i work best with/i })
    ).toBeInTheDocument();
  });

  it('renders all audience types', () => {
    render(<WhoIWorkWith />);
    expect(screen.getByText(/Founders/i)).toBeInTheDocument();
    expect(screen.getByText(/Growing startups/i)).toBeInTheDocument();
    expect(screen.getByText(/Agencies/i)).toBeInTheDocument();
    expect(screen.getByText(/Non-technical teams/i)).toBeInTheDocument();
  });

  it('renders audience descriptions', () => {
    render(<WhoIWorkWith />);
    expect(
      screen.getByText(/who need a senior frontend partner/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/whose engineering team is stretched thin/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/that need overflow capacity/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/drowning in engineering dependency/i)
    ).toBeInTheDocument();
  });

  it('renders as an unordered list', () => {
    render(<WhoIWorkWith />);
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(4);
  });

  it('has proper accessibility attributes', () => {
    render(<WhoIWorkWith />);
    const heading = screen.getByRole('heading', {
      name: /who i work best with/i,
    });
    expect(heading).toHaveAttribute('id', 'who-i-work-with-heading');
  });
});
