import React from 'react';
import { render, screen } from '@testing-library/react';
import PostBody from './PostBody';

jest.mock('./BreadCrumbs', () => {
  return function MockBreadCrumbs({ items }: { items: { label: string }[] }) {
    return (
      <nav data-testid='breadcrumbs'>
        {items.map(item => (
          <span key={item.label}>{item.label}</span>
        ))}
      </nav>
    );
  };
});

jest.mock('./UnsplashImage', () => {
  return function MockUnsplashImage({ alt }: { alt: string }) {
    return (
      <picture>
        <img alt={alt} data-testid='unsplash-image' />
      </picture>
    );
  };
});

jest.mock('./PostContent', () => {
  return function MockPostContent({ children }: { children: React.ReactNode }) {
    return <div data-testid='post-content'>{children}</div>;
  };
});

describe('PostBody', () => {
  const defaultProps = {
    cover: {
      src: '/photo-test-123' as const,
      alt: 'Test image',
      origin: 'https://unsplash.com/photos/test' as const,
      creator: '@photographer' as const,
      blurHash: 'abc123',
    },
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
    ],
  };

  it('renders breadcrumbs, image, and content', () => {
    render(<PostBody {...defaultProps}>Article body</PostBody>);

    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByTestId('unsplash-image')).toBeInTheDocument();
    expect(screen.getByTestId('post-content')).toBeInTheDocument();
    expect(screen.getByText('Article body')).toBeInTheDocument();
  });

  it('passes breadcrumb items correctly', () => {
    render(<PostBody {...defaultProps}>Content</PostBody>);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('passes alt text to UnsplashImage', () => {
    render(<PostBody {...defaultProps}>Content</PostBody>);

    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });
});
