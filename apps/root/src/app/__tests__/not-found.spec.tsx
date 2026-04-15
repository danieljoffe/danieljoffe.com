import { render, screen } from '@testing-library/react';
import NotFound from '../not-found';

jest.mock('@/utils/constants', () => ({
  HOME_LINK: { href: '/' },
}));

jest.mock('@/data/metadata/notFound', () => ({
  notFoundMetadata: { title: '404' },
}));

jest.mock('@/components/Nav', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/Footer', () => ({
  __esModule: true,
  default: () => null,
}));

describe('NotFound', () => {
  it('renders the 404 heading', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('renders a link back to home', () => {
    render(<NotFound />);
    const link = screen.getByRole('link', { name: /return to home page/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders descriptive text', () => {
    render(<NotFound />);
    expect(screen.getByText(/this page doesn't exist/i)).toBeInTheDocument();
  });
});
