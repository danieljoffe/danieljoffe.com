import { render, screen } from '@testing-library/react';
import TabletUpNav from './TabletUpNav';

jest.mock('./DarkModeToggle', () => {
  return function MockDarkModeToggle() {
    return <button data-testid='dark-mode-toggle'>Toggle</button>;
  };
});

jest.mock('./Links', () => {
  return function MockNavLinks({ pathname }: { pathname: string }) {
    return <nav data-testid='nav-links' data-pathname={pathname} />;
  };
});

describe('TabletUpNav', () => {
  it('renders NavLinks and DarkModeToggle', () => {
    render(<TabletUpNav pathname='/' />);
    expect(screen.getByTestId('nav-links')).toBeInTheDocument();
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
  });

  it('passes pathname to NavLinks', () => {
    render(<TabletUpNav pathname='/about' />);
    expect(screen.getByTestId('nav-links')).toHaveAttribute(
      'data-pathname',
      '/about'
    );
  });

  it('is hidden on mobile via CSS class', () => {
    const { container } = render(<TabletUpNav pathname='/' />);
    expect(container.firstChild).toHaveClass('hidden', 'md:flex');
  });
});
