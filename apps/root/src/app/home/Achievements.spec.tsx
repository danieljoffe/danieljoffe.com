import { render, screen } from '@testing-library/react';
import Achievements from './Achievements';
import { offerings } from '@/utils/offerings';

describe('Achievements', () => {
  it('renders the section heading', () => {
    render(<Achievements />);
    expect(
      screen.getByRole('heading', { name: /my achievements/i })
    ).toBeInTheDocument();
  });

  it('has aria-labelledby on the section', () => {
    const { container } = render(<Achievements />);
    const section = container.querySelector(
      '[aria-labelledby="achievements-heading"]'
    );
    expect(section).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /my achievements/i })
    ).toHaveAttribute('id', 'achievements-heading');
  });

  it('renders all achievement metrics', () => {
    render(<Achievements />);
    offerings.achievements.forEach(achievement => {
      expect(screen.getByText(achievement.metric)).toBeInTheDocument();
    });
  });

  it('renders all achievement descriptions', () => {
    render(<Achievements />);
    offerings.achievements.forEach(achievement => {
      expect(screen.getByText(achievement.text)).toBeInTheDocument();
    });
  });

  it('renders achievements in a list', () => {
    render(<Achievements />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(offerings.achievements.length);
  });

  it('renders an icon for each achievement', () => {
    const { container } = render(<Achievements />);
    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(offerings.achievements.length);
  });
});
