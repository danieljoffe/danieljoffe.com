import React from 'react';
import { render, screen } from '@testing-library/react';
import UnsplashImage, { UnsplashImageProps } from '.';
import { UNSPLASH_URL } from '@/utils/constants';

// Mock Next.js Image component
jest.mock('next/image', () => {
  const React = require('react');

  interface MockImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    priority?: boolean;
    fetchPriority?: 'high' | 'low';
    decoding?: 'sync' | 'async' | 'auto';
    quality?: number;
    loader?: (params: {
      src: string;
      width: number;
      quality?: number;
    }) => string;
    sizes?: string;
    placeholder?: string;
    blurDataURL?: string;
    unoptimized?: boolean;
    fill?: boolean;
  }

  const MockImage = React.forwardRef(
    (props: MockImageProps, ref: React.ForwardedRef<HTMLImageElement>) => {
      const {
        src,
        alt,
        width,
        height,
        priority,
        fetchPriority,
        decoding,
        quality,
        loader,
        sizes,
        placeholder,
        blurDataURL,
        unoptimized,
        fill,
        onLoad,
        ...rest
      } = props;

      // Simulate the loader function call if provided
      let finalSrc = src;
      if (loader && typeof loader === 'function') {
        finalSrc = loader({
          src: src as string,
          width: width as number,
          quality: props.quality as number,
        });
      }

      return (
        <picture>
          <img
            ref={ref}
            src={finalSrc}
            alt={alt}
            width={width}
            height={height}
            data-priority={priority}
            data-fetch-priority={fetchPriority}
            data-decoding={decoding}
            data-sizes={sizes}
            data-placeholder={placeholder}
            data-blur-data-url={blurDataURL}
            data-unoptimized={unoptimized}
            data-fill={fill}
            onLoad={onLoad}
            {...rest}
          />
        </picture>
      );
    }
  );
  MockImage.displayName = 'MockImage';
  return MockImage;
});

// Mock hooks
const mockUseGlobal = jest.fn();

jest.mock('@/state/Global/Context', () => ({
  useGlobal: () => mockUseGlobal(),
}));

// Mock Button component
jest.mock('@/components/Button', () => {
  const React = require('react');

  interface MockButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    as?: 'button' | 'link';
    href?: string;
    variant?: string;
    size?: string;
    target?: string;
    rel?: string;
  }

  const MockButton = React.forwardRef(
    (props: MockButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
      const { as, href, children, variant, size, target, rel, ...rest } = props;
      if (as === 'link' && href) {
        const anchorProps = {
          href,
          target,
          rel,
          ...rest,
        } as React.AnchorHTMLAttributes<HTMLAnchorElement>;

        return (
          <a ref={ref as React.Ref<HTMLAnchorElement>} {...anchorProps}>
            {children}
          </a>
        );
      }
      return (
        <button ref={ref} {...rest}>
          {children}
        </button>
      );
    }
  );

  MockButton.displayName = 'MockButton';
  return MockButton;
});

// Mock utils
jest.mock('@/utils/helpers', () => ({
  getBase64DataUrl: jest.fn(
    (color: string) => `data:image/svg+xml;base64,${color}`
  ),
}));

describe('UnsplashImage', () => {
  jest.setTimeout(10000); // 10 second timeout
  const mockProps: UnsplashImageProps = {
    src: '/photo-1645886702268-a28bf146bc35',
    alt: 'Test image',
    creator: '@testuser',
    origin: `${UNSPLASH_URL}/photos/test-photo` as const,
    blurHash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
    width: 800,
    height: 500,
    priority: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGlobal.mockReturnValue({
      windowWidth: 800, // Set to 800 to match test expectations
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Image component props', () => {
    it('should render Image component with decoding prop', () => {
      render(<UnsplashImage {...mockProps} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('data-decoding', 'async');
    });

    it('should render Image component with priority prop', () => {
      render(<UnsplashImage {...mockProps} priority={true} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('data-priority', 'true');
    });

    it('should set fetchPriority to high when priority is true', () => {
      render(<UnsplashImage {...mockProps} priority={true} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('data-fetch-priority', 'high');
    });

    it('should set fetchPriority to low when priority is false', () => {
      render(<UnsplashImage {...mockProps} priority={false} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('data-fetch-priority', 'low');
    });

    it('should render Image component with all required props', () => {
      render(<UnsplashImage {...mockProps} priority={false} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('data-decoding', 'async');
      expect(image).toHaveAttribute('data-priority', 'false');
      expect(image).toHaveAttribute('data-fetch-priority', 'low');
      expect(image).toHaveAttribute('data-unoptimized', 'false');
    });
  });

  describe('Image URL generation', () => {
    it('should generate correct URL with specified width and height', () => {
      render(<UnsplashImage {...mockProps} width={800} height={500} />);

      const image = screen.getByRole('img');
      const src = image.getAttribute('src');
      expect(src).toContain('w=800');
      expect(src).toContain('h=500');
      // q is omitted — auto=compress handles quality (perceptual q=45)
      expect(src).not.toContain('q=');
      expect(src).toContain('auto=format%2Ccompress');
      expect(src).toContain('fit=crop');
      expect(src).toContain('crop=faces%2Cfocalpoint');
    });

    it('should generate URL with different dimensions', () => {
      // Mock smaller window width to match the expected width
      mockUseGlobal.mockReturnValue({
        windowWidth: 400,
      });

      render(<UnsplashImage {...mockProps} width={400} height={225} />);

      const image = screen.getByRole('img');
      const src = image.getAttribute('src');
      expect(src).toContain('w=400');
      expect(src).toContain('h=225');
    });

    it('should add q param when quality is below 45', () => {
      render(<UnsplashImage {...mockProps} quality={35} />);

      const image = screen.getByRole('img');
      const src = image.getAttribute('src');
      expect(src).toContain('q=35');
    });

    it('should not add q param when quality is 45 or above', () => {
      render(<UnsplashImage {...mockProps} quality={75} />);

      const image = screen.getByRole('img');
      const src = image.getAttribute('src');
      expect(src).not.toContain('q=');
    });

    it('should use 9:16 aspect ratio when no height specified', () => {
      // For fill images, height is not required
      const fillProps = {
        ...mockProps,
        fill: true,
      };
      // Remove width and height for fill images
      delete (fillProps as Record<string, unknown>).width;
      delete (fillProps as Record<string, unknown>).height;

      render(<UnsplashImage {...fillProps} />);

      const image = screen.getByRole('img');
      const src = image.getAttribute('src');
      // For fill images without explicit width, loader defaults to 800
      // (width comes from Next.js Image based on sizes attribute in production)
      expect(src).toContain('w=800');
      // 9:16 aspect ratio for width 800 should be height 450
      expect(src).toContain('h=450');
    });
  });

  describe('Component structure', () => {
    it('should render figure with correct aspect ratio', () => {
      render(<UnsplashImage {...mockProps} width={800} height={500} />);

      const figure = screen.getByRole('figure');
      expect(figure).toBeInTheDocument();
      expect(figure).toHaveAttribute(
        'style',
        expect.stringContaining('aspect-ratio: 800/500')
      );
    });

    it('should render figcaption with creator link', () => {
      render(<UnsplashImage {...mockProps} />);

      const creatorLink = screen.getByText('@testuser,');
      expect(creatorLink).toBeInTheDocument();
    });

    it('should render image with correct alt text', () => {
      render(<UnsplashImage {...mockProps} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', mockProps.alt);
    });
  });

  describe('Error handling', () => {
    it('should throw error when required props are missing', () => {
      expect(() => {
        render(
          <UnsplashImage
            src={'/photo-test' as `/photo-${string}`}
            alt='test'
            creator={'@test' as `@${string}`}
            origin={`${UNSPLASH_URL}/photos/test` as const}
            blurHash=''
            priority={true}
          />
        );
      }).toThrow('Missing required props');
    });

    it('should throw error when width and height are missing for non-fill image', () => {
      const propsWithoutDimensions = {
        src: mockProps.src,
        alt: mockProps.alt,
        creator: mockProps.creator,
        origin: mockProps.origin,
        blurHash: mockProps.blurHash,
        priority: mockProps.priority,
        fill: false,
      } as UnsplashImageProps;

      expect(() => {
        render(<UnsplashImage {...propsWithoutDimensions} />);
      }).toThrow('Missing required props');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for creator link', () => {
      render(<UnsplashImage {...mockProps} />);

      const creatorLink = screen.getByLabelText(
        'Photo by @testuser on Unsplash'
      );
      expect(creatorLink).toBeInTheDocument();
    });

    it('should have proper alt text for image', () => {
      render(<UnsplashImage {...mockProps} alt='Beautiful landscape' />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Beautiful landscape');
    });
  });
});
