import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PathChooser from '../PathChooser';

describe('PathChooser', () => {
  it('renders all three path cards', () => {
    render(<PathChooser onSelect={jest.fn()} onSkip={jest.fn()} />);

    expect(
      screen.getByRole('button', {
        name: /i have a resume and a role in mind/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /i have a resume but i'm exploring roles/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /i'm not sure where to start/i })
    ).toBeInTheDocument();
  });

  it('calls onSelect with "A" when the first card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<PathChooser onSelect={onSelect} onSkip={jest.fn()} />);

    await user.click(
      screen.getByRole('button', {
        name: /i have a resume and a role in mind/i,
      })
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('A');
  });

  it('calls onSelect with "B" when the second card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<PathChooser onSelect={onSelect} onSkip={jest.fn()} />);

    await user.click(
      screen.getByRole('button', {
        name: /i have a resume but i'm exploring roles/i,
      })
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('B');
  });

  it('calls onSelect with "C" when the third card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<PathChooser onSelect={onSelect} onSkip={jest.fn()} />);

    await user.click(
      screen.getByRole('button', { name: /i'm not sure where to start/i })
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('C');
  });

  it('calls onSkip when the "Skip for now" button is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = jest.fn();
    render(<PathChooser onSelect={jest.fn()} onSkip={onSkip} />);

    await user.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('exposes each path card with an accessible label matching its title', () => {
    render(<PathChooser onSelect={jest.fn()} onSkip={jest.fn()} />);

    const buttons = screen
      .getAllByRole('button')
      .filter(b => b.getAttribute('aria-label'));

    // The three path cards each carry an explicit aria-label
    const labels = buttons.map(b => b.getAttribute('aria-label'));
    expect(labels).toEqual(
      expect.arrayContaining([
        'I have a resume and a role in mind',
        "I have a resume but I'm exploring roles",
        "I'm not sure where to start",
      ])
    );
  });
});
