import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { analytics } from '@/lib/analytics';
import PostThumbnail from '../index';

jest.mock('@/lib/analytics', () => ({
  analytics: { projectClick: jest.fn(), experienceClick: jest.fn() },
}));

jest.mock('../PostThumbnailDescription', () => ({
  __esModule: true,
  default: () => <div data-testid='description' />,
}));

jest.mock('../../UnsplashImage/UnsplashDecorativeAttribution', () => ({
  __esModule: true,
  default: () => <div data-testid='attribution' />,
}));

jest.mock('../../UnsplashImage', () => ({
  UnsplashFigure: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='figure'>{children}</div>
  ),
  UnsplashImg: (props: Record<string, unknown>) => (
    <img
      data-testid='unsplash-img'
      src={props.src as string}
      alt={props.alt as string}
      data-priority={String(props.priority)}
    />
  ),
}));

const baseProps = {
  slug: 'test-project',
  title: 'Test Project',
  description: 'A test project description',
  cover: {
    src: '/photo-test' as const,
    alt: 'Test cover image',
    origin: 'https://unsplash.com/photos/test' as const,
    creator: '@testcreator' as const,
    blurHash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  },
  link: {
    label: 'Test Project',
    href: '/projects/test-project',
  },
  duration: '2023 - 2024',
  role: 'Lead Developer',
  index: 0,
};

describe('PostThumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders an article element', () => {
    render(<PostThumbnail {...baseProps} />);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  test('renders link without aria-label (visible text provides accessible name)', () => {
    render(<PostThumbnail {...baseProps} />);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/projects/test-project');
    expect(link).not.toHaveAttribute('aria-label');
  });

  test('renders UnsplashImg, attribution, and description', () => {
    render(<PostThumbnail {...baseProps} />);
    expect(screen.getByTestId('unsplash-img')).toBeInTheDocument();
    expect(screen.getByTestId('attribution')).toBeInTheDocument();
    expect(screen.getByTestId('description')).toBeInTheDocument();
    expect(screen.getByTestId('figure')).toBeInTheDocument();
  });

  describe('analytics branch: /projects/ link', () => {
    test('clicking calls analytics.projectClick with slug', async () => {
      const user = userEvent.setup();
      render(<PostThumbnail {...baseProps} />);
      const link = screen.getByRole('link');
      await user.click(link);
      expect(analytics.projectClick).toHaveBeenCalledWith('test-project');
      expect(analytics.experienceClick).not.toHaveBeenCalled();
    });
  });

  describe('analytics branch: /experience/ link', () => {
    test('clicking calls analytics.experienceClick with slug', async () => {
      const user = userEvent.setup();
      const experienceProps = {
        ...baseProps,
        slug: 'test-experience',
        link: {
          label: 'Test Experience',
          href: '/experience/test-experience',
        },
      };
      render(<PostThumbnail {...experienceProps} />);
      const link = screen.getByRole('link');
      await user.click(link);
      expect(analytics.experienceClick).toHaveBeenCalledWith('test-experience');
      expect(analytics.projectClick).not.toHaveBeenCalled();
    });
  });

  describe('analytics branch: neither /projects/ nor /experience/', () => {
    test('clicking calls neither analytics method', async () => {
      const user = userEvent.setup();
      const otherProps = {
        ...baseProps,
        slug: 'test-other',
        link: {
          label: 'Test Other',
          href: '/services/test-other',
        },
      };
      render(<PostThumbnail {...otherProps} />);
      const link = screen.getByRole('link');
      await user.click(link);
      expect(analytics.projectClick).not.toHaveBeenCalled();
      expect(analytics.experienceClick).not.toHaveBeenCalled();
    });
  });

  describe('priority branch based on index', () => {
    test('index 0 sets priority to true', () => {
      render(<PostThumbnail {...baseProps} index={0} />);
      const img = screen.getByTestId('unsplash-img');
      expect(img).toHaveAttribute('data-priority', 'true');
    });

    test('index 1 sets priority to true', () => {
      render(<PostThumbnail {...baseProps} index={1} />);
      const img = screen.getByTestId('unsplash-img');
      expect(img).toHaveAttribute('data-priority', 'true');
    });

    test('index 2 sets priority to false', () => {
      render(<PostThumbnail {...baseProps} index={2} />);
      const img = screen.getByTestId('unsplash-img');
      expect(img).toHaveAttribute('data-priority', 'false');
    });

    test('index 5 sets priority to false', () => {
      render(<PostThumbnail {...baseProps} index={5} />);
      const img = screen.getByTestId('unsplash-img');
      expect(img).toHaveAttribute('data-priority', 'false');
    });
  });

  test('passes cover src and alt to UnsplashImg', () => {
    render(<PostThumbnail {...baseProps} />);
    const img = screen.getByTestId('unsplash-img');
    expect(img).toHaveAttribute('src', '/photo-test');
    expect(img).toHaveAttribute('alt', 'Test cover image');
  });
});
