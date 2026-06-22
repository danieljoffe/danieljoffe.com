import { render, screen } from '@testing-library/react';
import Page from './page';

jest.mock('./ResumeActions', () => ({
  __esModule: true,
  default: function ResumeActions() {
    return <div data-testid='resume-actions' />;
  },
}));

describe('Résumé page', () => {
  it('renders inside PageLayout wrapper', () => {
    render(<Page />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders the name as the page heading', () => {
    render(<Page />);
    expect(
      screen.getByRole('heading', { name: /daniel joffe/i })
    ).toBeInTheDocument();
  });

  it('renders the availability signal', () => {
    render(<Page />);
    expect(screen.getByText(/open to full-time roles/i)).toBeInTheDocument();
  });

  it('renders every résumé section label', () => {
    render(<Page />);
    expect(screen.getByText('Technical Skills')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Selected Projects')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
  });

  it('renders experience, a skill, and education content', () => {
    render(<Page />);
    expect(screen.getByText('FightCamp')).toBeInTheDocument();
    expect(screen.getByText('Internet Brands')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(
      screen.getByText('Western Governors University')
    ).toBeInTheDocument();
  });

  it('renders the résumé actions', () => {
    render(<Page />);
    expect(screen.getByTestId('resume-actions')).toBeInTheDocument();
  });
});
