import { render, screen, fireEvent } from '@testing-library/react';
import CalendlyButton from './CalendlyButton';

jest.mock('@/lib/analytics', () => ({
  analytics: { auditCalendlyClicked: jest.fn() },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >) => <a {...props}>{children}</a>,
}));

import { analytics } from '@/lib/analytics';

const mockedAnalytics = analytics as jest.Mocked<typeof analytics>;

describe('CalendlyButton', () => {
  beforeEach(() => {
    mockedAnalytics.auditCalendlyClicked.mockClear();
  });

  it('renders with correct text', () => {
    render(<CalendlyButton />);
    expect(screen.getByText('Book a free discovery call')).toBeInTheDocument();
  });

  it('links to the Calendly URL', () => {
    render(<CalendlyButton />);
    const link = screen.getByRole('link', {
      name: 'Book a free discovery call',
    });
    expect(link).toHaveAttribute(
      'href',
      'https://calendly.com/hello-danieljoffe/30min'
    );
  });

  it('fires analytics event on click', () => {
    render(<CalendlyButton />);
    fireEvent.click(screen.getByText('Book a free discovery call'));
    expect(mockedAnalytics.auditCalendlyClicked).toHaveBeenCalled();
  });
});
