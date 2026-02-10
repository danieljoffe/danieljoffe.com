import { render, screen, fireEvent } from '@testing-library/react';
import Hero from './Hero';
import { FULL_NAME, JOB_TITLE } from '@/utils/constants';

jest.mock('@/lib/analytics', () => ({
  analytics: {
    ctaClick: jest.fn(),
  },
}));

jest.mock('@/utils/helpers', () => ({
  downloadResume: jest.fn(),
  devLog: jest.fn(),
}));

jest.mock('next/dynamic', () => () => () => null);

describe('Home Hero', () => {
  it('renders the availability badge', () => {
    render(<Hero />);
    expect(
      screen.getByText(/available for contract work/i)
    ).toBeInTheDocument();
  });

  it('renders the hero heading with name', () => {
    render(<Hero />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/daniel joffe/i);
  });

  it('renders the job title', () => {
    render(<Hero />);
    expect(screen.getByText(JOB_TITLE)).toBeInTheDocument();
  });

  it('renders hero description text', () => {
    render(<Hero />);
    expect(screen.getByText('I optimize applications.')).toBeInTheDocument();
    expect(
      screen.getByText('I build scalable design systems.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/eliminating engineering bottlenecks/i)
    ).toBeInTheDocument();
  });

  it('renders "View case studies" link with correct href', () => {
    render(<Hero />);
    const link = screen.getByRole('link', { name: /view.*case studies/i });
    expect(link).toHaveAttribute('href', '/projects');
  });

  it('renders "Download resume" button', () => {
    render(<Hero />);
    expect(
      screen.getByRole('button', { name: /download.*resume/i })
    ).toBeInTheDocument();
  });

  it('has aria-labelledby pointing to hero heading', () => {
    const { container } = render(<Hero />);
    const section = container.querySelector('[aria-labelledby="hero-heading"]');
    expect(section).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute(
      'id',
      'hero-heading'
    );
  });

  it('has accessible labels on CTA buttons', () => {
    render(<Hero />);
    expect(
      screen.getByLabelText(`View ${FULL_NAME}'s case studies`)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(`Download ${FULL_NAME}'s resume`)
    ).toBeInTheDocument();
  });

  it('triggers analytics when "View case studies" is clicked', async () => {
    const { analytics } = await import('@/lib/analytics');
    render(<Hero />);
    const link = screen.getByRole('link', { name: /view.*case studies/i });
    fireEvent.click(link);
    expect(analytics.ctaClick).toHaveBeenCalledWith(
      'view_case_studies',
      '/projects'
    );
  });

  it('triggers analytics and downloadResume when "Download resume" is clicked', async () => {
    const { analytics } = await import('@/lib/analytics');
    const { downloadResume } = await import('@/utils/helpers');
    render(<Hero />);
    const button = screen.getByRole('button', { name: /download.*resume/i });
    fireEvent.click(button);
    expect(analytics.ctaClick).toHaveBeenCalledWith('download_resume', '/');
    expect(downloadResume).toHaveBeenCalled();
  });
});
