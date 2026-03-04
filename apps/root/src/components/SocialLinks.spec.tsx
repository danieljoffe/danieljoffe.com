import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialLinks from './SocialLinks';

jest.mock('next/link', () => {
  const React = require('react');
  const MockLink = React.forwardRef(
    (
      props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string },
      ref: React.ForwardedRef<HTMLAnchorElement>
    ) => {
      const { href, children, onClick, ...rest } = props;
      return (
        <a
          ref={ref}
          href={href}
          onClick={e => {
            e.preventDefault();
            onClick?.(e);
          }}
          {...rest}
        >
          {children}
        </a>
      );
    }
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockCtaClick = jest.fn();
const mockDownloadResume = jest.fn();

jest.mock('@/lib/analytics', () => ({
  analytics: {
    ctaClick: (...args: unknown[]) => mockCtaClick(...args),
  },
}));

jest.mock('@/utils/helpers', () => ({
  downloadResume: () => mockDownloadResume(),
  devLog: jest.fn(),
  isProduction: () => false,
}));

describe('SocialLinks', () => {
  beforeEach(() => {
    mockCtaClick.mockClear();
    mockDownloadResume.mockClear();
  });

  it('renders email, linkedin, github, and download buttons', () => {
    render(<SocialLinks />);
    expect(screen.getByLabelText('Send Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Visit LinkedIn Profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Visit GitHub Profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Download Resume (PDF)')).toBeInTheDocument();
  });

  it('fires analytics on email click', async () => {
    const user = userEvent.setup();
    render(<SocialLinks />);
    await user.click(screen.getByLabelText('Send Email'));
    expect(mockCtaClick).toHaveBeenCalledWith(
      'click_email_message',
      expect.any(String)
    );
  });

  it('fires analytics and download on resume click', async () => {
    const user = userEvent.setup();
    render(<SocialLinks />);
    await user.click(screen.getByLabelText('Download Resume (PDF)'));
    expect(mockCtaClick).toHaveBeenCalledWith(
      'download_resume',
      expect.any(String)
    );
    expect(mockDownloadResume).toHaveBeenCalled();
  });
});
