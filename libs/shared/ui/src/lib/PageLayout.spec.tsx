import { render, screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';

describe('PageLayout', () => {
  it('renders children', () => {
    render(<PageLayout>Page Content</PageLayout>);
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('renders a main landmark', () => {
    render(<PageLayout>Content</PageLayout>);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('has id="main-content" for the skip-nav target', () => {
    render(<PageLayout>Content</PageLayout>);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('is full-width and provides vertical rhythm', () => {
    render(<PageLayout>Content</PageLayout>);
    expect(screen.getByRole('main')).toHaveClass(
      'flex',
      'w-full',
      'flex-col',
      'gap-y-16'
    );
  });

  it('merges custom className with defaults', () => {
    render(<PageLayout className='custom-class'>Content</PageLayout>);
    expect(screen.getByRole('main')).toHaveClass('w-full', 'custom-class');
  });

  it('passes through additional HTML attributes', () => {
    render(<PageLayout aria-label='Main content'>Content</PageLayout>);
    expect(screen.getByRole('main')).toHaveAttribute(
      'aria-label',
      'Main content'
    );
  });
});
