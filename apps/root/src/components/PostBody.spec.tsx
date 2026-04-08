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
  TableOfContents: function MockTableOfContents({
    mobile,
    desktop,
  }: {
    mobile?: boolean;
    desktop?: boolean;
  }) {
    return (
      <nav
        data-testid={
          mobile
            ? 'table-of-contents-mobile'
            : desktop
              ? 'table-of-contents-desktop'
              : 'table-of-contents'
        }
      />
    );
  },
  Heading: function MockHeading({
    as,
    children,
    className,
    id,
  }: {
    as?: string;
    variant: string;
    children: React.ReactNode;
    className?: string;
    id?: string;
  }) {
    const Tag = (as || 'h1') as React.ElementType;
    return (
      <Tag className={className} id={id}>
        {children}
      </Tag>
    );
  },
}));

describe('PostBody', () => {
  const defaultProps = {
    cover: {
      src: '/photo-test-123' as const,
      alt: 'Test image',
      origin: 'https://unsplash.com/photos/test' as const,
      creator: '@photographer' as const,
    },
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
    ],
    title: 'Test Post Title',
    date: '2024-04-02',
    tags: ['React', 'TypeScript'],
    readingTime: 5,
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
    expect(screen.getByText('React, TypeScript')).toBeInTheDocument();
  });

  it('does not render tag row when tags array is empty', () => {
    render(
      <PostBody {...defaultProps} tags={[]}>
        Content
      </PostBody>
    );

    expect(screen.queryByText('React, TypeScript')).not.toBeInTheDocument();
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

  it('renders mobile and desktop table of contents', () => {
    render(<PostBody {...defaultProps}>Content</PostBody>);

    expect(screen.getByTestId('table-of-contents-mobile')).toBeInTheDocument();
    expect(screen.getByTestId('table-of-contents-desktop')).toBeInTheDocument();
  });
});
