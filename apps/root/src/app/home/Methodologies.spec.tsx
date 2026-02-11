import { render, screen } from '@testing-library/react';
import Methodologies from './Methodologies';
import { offerings } from '@/data/offerings';

describe('Methodologies', () => {
  it('renders the section heading', () => {
    render(<Methodologies />);
    expect(
      screen.getByRole('heading', { name: /my methodology/i })
    ).toBeInTheDocument();
  });

  it('has aria-labelledby on the section', () => {
    const { container } = render(<Methodologies />);
    const section = container.querySelector(
      '[aria-labelledby="methodologies-heading"]'
    );
    expect(section).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /my methodology/i })
    ).toHaveAttribute('id', 'methodologies-heading');
  });

  it('renders all methodology titles', () => {
    render(<Methodologies />);
    offerings.methodology.forEach(methodology => {
      expect(
        screen.getByRole('heading', { name: methodology.title })
      ).toBeInTheDocument();
    });
  });

  it('renders all methodology descriptions', () => {
    render(<Methodologies />);
    offerings.methodology.forEach(methodology => {
      expect(screen.getByText(methodology.text)).toBeInTheDocument();
    });
  });

  it('renders methodologies in a list', () => {
    render(<Methodologies />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(offerings.methodology.length);
  });

  it('renders an icon for each methodology', () => {
    const { container } = render(<Methodologies />);
    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(offerings.methodology.length);
  });
});
