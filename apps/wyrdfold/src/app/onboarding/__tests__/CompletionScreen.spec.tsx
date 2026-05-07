import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CompletionScreen from '../CompletionScreen';

expect.extend(toHaveNoViolations);

// CompletionScreen renders Button as=link → next/link. Mock to a real <a>.
jest.mock('next/link', () => {
  return function MockLink(
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
  ) {
    const { href, children, ...rest } = props;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: jest.fn(), push: jest.fn() }),
}));

describe('CompletionScreen', () => {
  it("renders the 'all set' heading", () => {
    render(<CompletionScreen />);
    expect(
      screen.getByRole('heading', { level: 2, name: /all set/i })
    ).toBeInTheDocument();
  });

  it('renders the supporting copy directing the user to targets', () => {
    render(<CompletionScreen />);
    expect(
      screen.getByText(/head to your targets to start tracking jobs/i)
    ).toBeInTheDocument();
  });

  it('renders a "Go to Targets" link pointing to /targets', () => {
    render(<CompletionScreen />);
    const link = screen.getByRole('link', { name: /go to targets/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/targets');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CompletionScreen />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
