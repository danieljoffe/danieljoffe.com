import { render, screen } from '@testing-library/react';
import DeviceTabs from './DeviceTabs';

describe('DeviceTabs', () => {
  it('renders nothing when no paired scan', () => {
    const { container } = render(
      <DeviceTabs
        currentDevice='mobile'
        currentScanId='scan-1'
        pairedScanId={null}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders mobile and desktop tabs when paired', () => {
    render(
      <DeviceTabs
        currentDevice='mobile'
        currentScanId='scan-mobile'
        pairedScanId='scan-desktop'
      />
    );
    const nav = screen.getByRole('navigation', { name: /device view/i });
    expect(nav).toBeInTheDocument();

    const mobileLink = screen.getByRole('link', { name: /mobile/i });
    const desktopLink = screen.getByRole('link', { name: /desktop/i });
    expect(mobileLink).toHaveAttribute('href', '/audit/r/scan-mobile');
    expect(desktopLink).toHaveAttribute('href', '/audit/r/scan-desktop');
  });

  it('marks current device tab as active', () => {
    render(
      <DeviceTabs
        currentDevice='desktop'
        currentScanId='scan-desktop'
        pairedScanId='scan-mobile'
      />
    );
    const desktopLink = screen.getByRole('link', { name: /desktop/i });
    expect(desktopLink).toHaveAttribute('aria-current', 'page');

    const mobileLink = screen.getByRole('link', { name: /mobile/i });
    expect(mobileLink).not.toHaveAttribute('aria-current');
  });

  it('correctly maps IDs when viewing desktop', () => {
    render(
      <DeviceTabs
        currentDevice='desktop'
        currentScanId='scan-desktop'
        pairedScanId='scan-mobile'
      />
    );
    const mobileLink = screen.getByRole('link', { name: /mobile/i });
    const desktopLink = screen.getByRole('link', { name: /desktop/i });
    expect(mobileLink).toHaveAttribute('href', '/audit/r/scan-mobile');
    expect(desktopLink).toHaveAttribute('href', '/audit/r/scan-desktop');
  });
});
