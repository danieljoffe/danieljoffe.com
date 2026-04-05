import { render, screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';

describe('PageLayout', () => {
  it('renders children', () => {
    render(<PageLayout>Page Content</PageLayout>);
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('renders as main element', () => {
    render(<PageLayout>Content</PageLayout>);
    const outer = screen.getByTestId('page-container-outer');
    expect(outer.tagName).toBe('MAIN');
  });

  it('has id="main-content" for skip-nav target', () => {
    render(<PageLayout>Content</PageLayout>);
    const outer = screen.getByTestId('page-container-outer');
    expect(outer).toHaveAttribute('id', 'main-content');
  });

  it('uses sm size by default', () => {
    render(<PageLayout>Content</PageLayout>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('max-w-3xl');
  });

  it('uses md size when wide=true', () => {
    render(<PageLayout wide>Content</PageLayout>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('max-w-5xl');
  });

  it('applies custom className to inner container', () => {
    render(<PageLayout className='custom-class'>Content</PageLayout>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('custom-class');
  });

  it('passes through additional HTML attributes', () => {
    render(<PageLayout aria-label='Main content'>Content</PageLayout>);
    const outer = screen.getByTestId('page-container-outer');
    expect(outer).toHaveAttribute('aria-label', 'Main content');
  });
});
