import { render, screen } from '@testing-library/react';
import { Step } from './Step';

describe('Step', () => {
  it('renders the number, title, and description', () => {
    render(
      <Step
        number={1}
        title='Pick a framework'
        description='Choose the tools that fit the team.'
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Pick a framework')).toBeInTheDocument();
    expect(
      screen.getByText('Choose the tools that fit the team.')
    ).toBeInTheDocument();
  });

  it('accepts a string for the step number', () => {
    render(<Step number='A' title='Kickoff' description='Plan the work.' />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders the title as a heading element when titleAs is set', () => {
    render(
      <Step
        number={2}
        title='Ship it'
        description='Deploy to production.'
        titleAs='h3'
      />
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Ship it' })
    ).toBeInTheDocument();
  });

  it('does not expose the title as a heading by default (titleAs="p")', () => {
    render(<Step number={3} title='Measure' description='Collect metrics.' />);
    expect(
      screen.queryByRole('heading', { name: 'Measure' })
    ).not.toBeInTheDocument();
  });
});
