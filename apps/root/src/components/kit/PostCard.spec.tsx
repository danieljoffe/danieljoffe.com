import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { analytics } from '@/lib/analytics';
import type { PostThumbnail } from '@/types/postTypes';
import { PostCard } from './PostCard';

expect.extend(toHaveNoViolations);

jest.mock('@/lib/analytics', () => ({
  analytics: {
    projectClick: jest.fn(),
    experienceClick: jest.fn(),
    blogClick: jest.fn(),
  },
}));

function makePost(overrides: Partial<PostThumbnail> = {}): PostThumbnail {
  return {
    slug: 'my-post',
    title: 'My Post',
    description: 'Short description',
    cover: { src: '/images/my-post.webp', alt: 'My post cover' },
    link: { href: '/blog/my-post' },
    readingTime: 4,
    ...overrides,
  };
}

describe('PostCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, description and cover image', () => {
    render(<PostCard post={makePost()} />);
    expect(screen.getByText('My Post')).toBeInTheDocument();
    expect(screen.getByText('Short description')).toBeInTheDocument();
    expect(screen.getByAltText('My post cover')).toBeInTheDocument();
  });

  it('links to the post href', () => {
    render(<PostCard post={makePost()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/blog/my-post');
  });

  it('shows the role badge when the post has a role', () => {
    render(<PostCard post={makePost({ role: 'Senior Frontend Engineer' })} />);
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
  });

  it('renders the reading time when provided', () => {
    render(<PostCard post={makePost({ readingTime: 7 })} />);
    expect(screen.getByText('7 min read')).toBeInTheDocument();
  });

  it('renders a company logo image when the logo prop is supplied', () => {
    // CompanyLogo uses alt='' (decorative) — no accessible name, so we
    // can't query by role. Match the rendered <img src=...> directly.
    const { container } = render(
      <PostCard post={makePost()} logo='/images/acme.png' />
    );
    const logoImg = container.querySelector('img[src*="/images/acme.png"]');
    expect(logoImg).not.toBeNull();
  });

  it('fires the analytics handler for its analyticsType on click', async () => {
    const user = userEvent.setup();
    render(<PostCard post={makePost()} analyticsType='blog' />);

    await user.click(screen.getByRole('link'));
    expect(analytics.blogClick).toHaveBeenCalledWith('my-post');
    expect(analytics.projectClick).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PostCard post={makePost()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
