import { render, screen } from '@testing-library/react';
import Page from './page';

function Hero() {
  return <div data-testid='hero' />;
}
Hero.displayName = 'Hero';
jest.mock('./home/Hero', Hero);

function PreviousTeams() {
  return <div data-testid='previous-teams' />;
}
PreviousTeams.displayName = 'PreviousTeams';
jest.mock('./home/PreviousTeams', PreviousTeams);

function Achievements() {
  return <div data-testid='achievements' />;
}
Achievements.displayName = 'Achievements';
jest.mock('./home/Achievements', Achievements);

function Methodologies() {
  return <div data-testid='methodologies' />;
}
Methodologies.displayName = 'Methodologies';
jest.mock('./home/Methodologies', Methodologies);

function CTA() {
  return <div data-testid='cta' />;
}
CTA.displayName = 'CTA';
jest.mock('./home/CTA', CTA);

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
