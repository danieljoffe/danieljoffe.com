import { render, screen } from '@testing-library/react';
import { CompanyLogo } from './CompanyLogo';

describe('CompanyLogo', () => {
  it('renders the image with the provided alt text', () => {
    render(<CompanyLogo src='/images/acme.png' alt='Acme logo' />);
    expect(screen.getByAltText('Acme logo')).toBeInTheDocument();
  });

  it('uses the src attribute on the underlying image', () => {
    render(<CompanyLogo src='/images/acme.png' alt='Acme logo' />);
    const img = screen.getByAltText('Acme logo') as HTMLImageElement;
    expect(img.getAttribute('src')).toContain('/images/acme.png');
  });

  it('renders an empty alt when the label is visually decorative', () => {
    const { container } = render(<CompanyLogo src='/images/acme.png' alt='' />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('renders at each supported size without throwing', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const { unmount } = render(
        <CompanyLogo src='/images/acme.png' alt={`Acme ${size}`} size={size} />
      );
      expect(screen.getByAltText(`Acme ${size}`)).toBeInTheDocument();
      unmount();
    }
  });
});
