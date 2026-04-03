import { render, screen } from '@testing-library/react';
import Page from './page';

jest.mock('next/image', () => {
  return function MockImage({ alt }: { alt: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} />;
  };
});

jest.mock('./home/HeroActions', () => ({
  __esModule: true,
  default: function HeroActions() {
    return <div data-testid='hero-actions' />;
  },
}));

jest.mock('@/components/kit/CoverImage', () => ({
  CoverImage: function MockCoverImage() {
    return <div data-testid='cover-image' />;
  },
}));

describe('Homepage', () => {
  it('renders inside PageLayout wrapper', () => {
    render(<Page />);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('renders hero heading with name', () => {
    render(<Page />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/daniel joffe/i);
  });

  it('renders hero descriptions', () => {
    render(<Page />);
    expect(
      screen.getByText('I build full-stack products.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('I architect backend systems.')
    ).toBeInTheDocument();
  });

  it('renders Previous Teams section', () => {
    render(<Page />);
    expect(screen.getByText(/teams i've worked with/i)).toBeInTheDocument();
  });

  it('renders Achievements section', () => {
    render(<Page />);
    expect(screen.getByText(/achievements/i)).toBeInTheDocument();
  });

  it('renders How I Work section', () => {
    render(<Page />);
    expect(screen.getByText(/how i work/i)).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    render(<Page />);
    expect(
      screen.getByRole('heading', {
        name: /let's build something great together/i,
      })
    ).toBeInTheDocument();
  });

  it('renders HeroActions component', () => {
    render(<Page />);
    expect(screen.getByTestId('hero-actions')).toBeInTheDocument();
  });
});
