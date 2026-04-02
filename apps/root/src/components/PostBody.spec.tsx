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

jest.mock('@/components/kit', () => ({
  TableOfContents: function MockTableOfContents() {
    return <nav data-testid='table-of-contents' />;
  },
}));

jest.mock('./Button', () => {
  return function MockButton({
    children,
    href,
  }: {
    children: React.ReactNode;
    href?: string;
  }) {
    return (
      <a href={href} data-testid='back-link'>
        {children}
      </a>
    );
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
    title: 'Test Post Title',
    date: '2024-04-02',
    tags: ['React', 'TypeScript'],
    readingTime: 5,
    backLink: { label: 'Projects', href: '/projects' },
  };

  it('renders breadcrumbs, image, title, and content', () => {
    render(<PostBody {...defaultProps}>Article body</PostBody>);

    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByTestId('unsplash-image')).toBeInTheDocument();
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
    expect(screen.getByText('Article body')).toBeInTheDocument();
  });

  it('renders date, reading time, and tags', () => {
    render(<PostBody {...defaultProps}>Content</PostBody>);

    expect(screen.getByText('5 min read')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('passes breadcrumb items correctly', () => {
    render(<PostBody {...defaultProps}>Content</PostBody>);

    expect(screen.getByText('Home')).toBeInTheDocument();
    const breadcrumbs = screen.getByTestId('breadcrumbs');
    expect(breadcrumbs).toHaveTextContent('Projects');
  });

  it('passes alt text to UnsplashImage', () => {
    render(<PostBody {...defaultProps}>Content</PostBody>);

    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });

  it('renders table of contents', () => {
    render(<PostBody {...defaultProps}>Content</PostBody>);

    expect(screen.getByTestId('table-of-contents')).toBeInTheDocument();
  });
});
