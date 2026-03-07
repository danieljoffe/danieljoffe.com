import { render, screen, fireEvent } from '@testing-library/react';
import CTA from './CTA';
import { FULL_NAME } from '@/utils/constants';

jest.mock('@/lib/analytics', () => ({
  analytics: {
    ctaClick: jest.fn(),
  },
}));

describe('Home CTA', () => {
  it('renders the section heading', () => {
    render(<CTA />);
    expect(
      screen.getByRole('heading', {
        name: /let's build something great together/i,
      })
    ).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<CTA />);
    expect(
      screen.getByText(/available for contract projects/i)
    ).toBeInTheDocument();
  });

  it('renders "Start a conversation" link with correct href', () => {
    render(<CTA />);
    const link = screen.getByRole('link', {
      name: /start a conversation/i,
    });
    expect(link).toHaveAttribute('href', '/about?scrollTo=contact-form');
  });

  it('renders "View my work" link with correct href', () => {
    render(<CTA />);
    const link = screen.getByRole('link', { name: /view my work/i });
    expect(link).toHaveAttribute('href', '/projects');
  });

  it('has accessible aria-labels on both links', () => {
    render(<CTA />);
    expect(
      screen.getByLabelText(`Start a conversation with ${FULL_NAME}`)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('View my work')).toBeInTheDocument();
  });

  it('has aria-labelledby on the section', () => {
    const { container } = render(<CTA />);
    const section = container.querySelector('[aria-labelledby="cta-heading"]');
    expect(section).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'cta-heading'
    );
  });

  it('triggers analytics when "Start a conversation" is clicked', async () => {
    const { analytics } = await import('@/lib/analytics');
    render(<CTA />);
    const link = screen.getByRole('link', {
      name: /start a conversation/i,
    });
    fireEvent.click(link);
    expect(analytics.ctaClick).toHaveBeenCalledWith(
      'start_conversation',
      '/about?scrollTo=contact-form'
    );
  });

  it('triggers analytics when "View my work" is clicked', async () => {
    const { analytics } = await import('@/lib/analytics');
    render(<CTA />);
    const link = screen.getByRole('link', { name: /view my work/i });
    fireEvent.click(link);
    expect(analytics.ctaClick).toHaveBeenCalledWith(
      'view_my_work',
      '/projects'
    );
  });
});
