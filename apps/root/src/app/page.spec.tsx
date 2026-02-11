import { render, screen } from '@testing-library/react';
import Page from './page';

jest.mock('./home/Hero', () => ({
  __esModule: true,
  default: function Hero() {
    return <div data-testid='hero' />;
  },
}));

jest.mock('./home/PreviousTeams', () => ({
  __esModule: true,
  default: function PreviousTeams() {
    return <div data-testid='previous-teams' />;
  },
}));

jest.mock('./home/Achievements', () => ({
  __esModule: true,
  default: function Achievements() {
    return <div data-testid='achievements' />;
  },
}));

jest.mock('./home/Methodologies', () => ({
  __esModule: true,
  default: function Methodologies() {
    return <div data-testid='methodologies' />;
  },
}));

jest.mock('./home/CTA', () => ({
  __esModule: true,
  default: function CTA() {
    return <div data-testid='cta' />;
  },
}));

describe('Homepage', () => {
  it('renders inside MainContent wrapper', () => {
    render(<Page />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders Hero section', () => {
    render(<Page />);
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });

  it('renders PreviousTeams section', () => {
    render(<Page />);
    expect(screen.getByTestId('previous-teams')).toBeInTheDocument();
  });

  it('renders Achievements section', () => {
    render(<Page />);
    expect(screen.getByTestId('achievements')).toBeInTheDocument();
  });

  it('renders Methodologies section', () => {
    render(<Page />);
    expect(screen.getByTestId('methodologies')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    render(<Page />);
    expect(screen.getByTestId('cta')).toBeInTheDocument();
  });
});
