import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

const renderToggle = () =>
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
  });

  it('renders three theme buttons', () => {
    renderToggle();
    expect(screen.getByTitle('Light')).toBeInTheDocument();
    expect(screen.getByTitle('Dark')).toBeInTheDocument();
    expect(screen.getByTitle('System')).toBeInTheDocument();
  });

  it('switches to dark theme when Dark button is clicked', () => {
    renderToggle();
    fireEvent.click(screen.getByTitle('Dark'));
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('switches to light theme when Light button is clicked', () => {
    renderToggle();
    fireEvent.click(screen.getByTitle('Light'));
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('switches to system theme when System button is clicked', () => {
    renderToggle();
    fireEvent.click(screen.getByTitle('System'));
    expect(localStorage.getItem('theme')).toBe('system');
  });

  it('has accessible button titles', () => {
    renderToggle();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute('title', 'Light');
    expect(buttons[1]).toHaveAttribute('title', 'Dark');
    expect(buttons[2]).toHaveAttribute('title', 'System');
  });
});
