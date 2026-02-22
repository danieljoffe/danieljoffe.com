import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpandableScreenshot from './ExpandableScreenshot';

describe('ExpandableScreenshot', () => {
  it('renders a Globe icon when no screenshot URL', () => {
    const { container } = render(
      <ExpandableScreenshot screenshotUrl={null} alt='No screenshot' />
    );
    // Should render a span with the Globe icon, not a button
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('renders a button with image when screenshot URL is provided', () => {
    render(
      <ExpandableScreenshot
        screenshotUrl='https://example.com/shot.png'
        alt='Test screenshot'
      />
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByAltText('Test screenshot')).toBeInTheDocument();
  });

  it('starts collapsed with aria-expanded=false', () => {
    render(
      <ExpandableScreenshot
        screenshotUrl='https://example.com/shot.png'
        alt='Test'
      />
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Expand screenshot'
    );
  });

  it('expands on click and updates aria attributes', async () => {
    const user = userEvent.setup();
    render(
      <ExpandableScreenshot
        screenshotUrl='https://example.com/shot.png'
        alt='Test'
      />
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Collapse screenshot'
    );
  });

  it('collapses on second click', async () => {
    const user = userEvent.setup();
    render(
      <ExpandableScreenshot
        screenshotUrl='https://example.com/shot.png'
        alt='Test'
      />
    );

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('applies expanded CSS classes when expanded', async () => {
    const user = userEvent.setup();
    render(
      <ExpandableScreenshot
        screenshotUrl='https://example.com/shot.png'
        alt='Test'
      />
    );

    const img = screen.getByAltText('Test');

    // Collapsed: should have the small dimensions
    expect(img.className).toContain('w-[9rem]');

    await user.click(screen.getByRole('button'));

    // Expanded: should have the larger dimensions
    expect(img.className).toContain('w-[13.5rem]');
  });
});
