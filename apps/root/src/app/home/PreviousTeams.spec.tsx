import { render, screen, fireEvent } from '@testing-library/react';
import PreviousTeams from './PreviousTeams';
import { experienceFull } from '@/data/experience';

jest.mock('@/lib/analytics', () => ({
  analytics: {
    experienceClick: jest.fn(),
  },
}));

jest.mock('next/image', () => {
  return function MockImage({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) {
    return (
      <picture>
        <img src={src} alt={alt} width={width} height={height} />
      </picture>
    );
  };
});

const companies = Object.values(experienceFull);

describe('PreviousTeams', () => {
  it('renders the section heading', () => {
    render(<PreviousTeams />);
    expect(
      screen.getByRole('heading', { name: /teams i've worked with/i })
    ).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<PreviousTeams />);
    expect(
      screen.getByText(/fast, beautiful, and inclusive digital experiences/i)
    ).toBeInTheDocument();
  });

  it('renders all company logos', () => {
    render(<PreviousTeams />);
    companies.forEach(company => {
      expect(screen.getByAltText(company.company)).toBeInTheDocument();
    });
  });

  it('renders company links with correct hrefs', () => {
    render(<PreviousTeams />);
    companies.forEach(company => {
      const link = screen.getByRole('link', { name: company.company });
      expect(link).toHaveAttribute('href', `/experience/${company.slug}`);
    });
  });

  it('has aria-labels on all company links', () => {
    render(<PreviousTeams />);
    companies.forEach(company => {
      expect(
        screen.getByRole('link', { name: company.company })
      ).toBeInTheDocument();
    });
  });

  it('has aria-labelledby on the section', () => {
    const { container } = render(<PreviousTeams />);
    const section = container.querySelector(
      '[aria-labelledby="previous-teams-heading"]'
    );
    expect(section).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /teams i've worked with/i })
    ).toHaveAttribute('id', 'previous-teams-heading');
  });

  it('renders companies in a list', () => {
    render(<PreviousTeams />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(companies.length);
  });

  it('triggers analytics when a company link is clicked', async () => {
    const { analytics } = await import('@/lib/analytics');
    render(<PreviousTeams />);
    const firstCompany = companies[0];
    const link = screen.getByRole('link', { name: firstCompany.company });
    fireEvent.click(link);
    expect(analytics.experienceClick).toHaveBeenCalledWith(firstCompany.slug);
  });
});
