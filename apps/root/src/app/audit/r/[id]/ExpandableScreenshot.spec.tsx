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

    // Dimension classes are on the wrapper div, not the img
    const wrapper = screen.getByAltText('Test').parentElement!;

    // Collapsed: should have the small dimensions
    expect(wrapper.className).toContain('w-[9rem]');

    await user.click(screen.getByRole('button'));

    // Expanded: should have the larger dimensions
    expect(wrapper.className).toContain('w-[13.5rem]');
  });

  it('uses portrait dimensions for mobile (default)', () => {
    render(
      <ExpandableScreenshot
        screenshotUrl='https://example.com/shot.png'
        alt='Mobile'
      />
    );
    const wrapper = screen.getByAltText('Mobile').parentElement!;
    expect(wrapper.className).toContain('w-[9rem]');
    expect(wrapper.className).toContain('h-[16rem]');
  });

  it('uses landscape dimensions for desktop', () => {
    render(
      <ExpandableScreenshot
        screenshotUrl='https://example.com/shot.png'
        alt='Desktop'
        deviceMode='desktop'
      />
    );
    const wrapper = screen.getByAltText('Desktop').parentElement!;
    expect(wrapper.className).toContain('w-[16rem]');
    expect(wrapper.className).toContain('h-[11rem]');
  });

  it('applies desktop expanded dimensions on click', async () => {
    const user = userEvent.setup();
    render(
      <ExpandableScreenshot
        screenshotUrl='https://example.com/shot.png'
        alt='Desktop'
        deviceMode='desktop'
      />
    );

    await user.click(screen.getByRole('button'));

    const wrapper = screen.getByAltText('Desktop').parentElement!;
    expect(wrapper.className).toContain('w-[24rem]');
    expect(wrapper.className).toContain('h-[16.5rem]');
  });
});
