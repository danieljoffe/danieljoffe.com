import { render, screen } from '@testing-library/react';
import { ColorPalette } from './ColorPalette';

describe('ColorPalette', () => {
  it('renders all color group headings', () => {
    render(<ColorPalette />);
    expect(
      screen.getByRole('heading', { name: 'Background' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Foreground' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Accent' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Borders' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Semantic' })
    ).toBeInTheDocument();
  });

  it('renders background colors', () => {
    render(<ColorPalette />);
    expect(screen.getByText('Charcoal')).toBeInTheDocument();
    expect(screen.getByText('Graphite')).toBeInTheDocument();
    expect(screen.getByText('Slate')).toBeInTheDocument();
  });

  it('renders foreground colors', () => {
    render(<ColorPalette />);
    expect(screen.getByText('Ivory')).toBeInTheDocument();
    expect(screen.getByText('Pewter')).toBeInTheDocument();
    expect(screen.getByText('Smoke')).toBeInTheDocument();
  });

  it('renders accent colors', () => {
    render(<ColorPalette />);
    expect(screen.getByText('Lavender')).toBeInTheDocument();
    expect(screen.getByText('Bright Lavender')).toBeInTheDocument();
    expect(screen.getByText('Deep Lavender')).toBeInTheDocument();
    expect(screen.getByText('Dark Lavender')).toBeInTheDocument();
  });

  it('renders border colors', () => {
    render(<ColorPalette />);
    expect(screen.getByText('Ash')).toBeInTheDocument();
    expect(screen.getByText('Stone')).toBeInTheDocument();
  });

  it('renders semantic colors', () => {
    render(<ColorPalette />);
    expect(screen.getByText('Mint')).toBeInTheDocument();
    expect(screen.getByText('Amber')).toBeInTheDocument();
    expect(screen.getByText('Salmon')).toBeInTheDocument();
    expect(screen.getByText('Sky')).toBeInTheDocument();
  });

  it('renders hex values', () => {
    render(<ColorPalette />);
    expect(screen.getByText('#141517')).toBeInTheDocument();
    expect(screen.getByText('#F5F4F1')).toBeInTheDocument();
    expect(screen.getByText('#A99BC8')).toBeInTheDocument();
  });

  it('renders color roles', () => {
    render(<ColorPalette />);
    expect(screen.getAllByText('Background').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Background Alt')).toBeInTheDocument();
    expect(screen.getByText('Background Elevated')).toBeInTheDocument();
  });

  it('renders contrast information for colors that have it', () => {
    render(<ColorPalette />);
    expect(screen.getByText('Contrast: 15.9:1 AAA')).toBeInTheDocument();
    expect(screen.getByText('Contrast: 7.1:1 AAA')).toBeInTheDocument();
  });

  it('renders color swatches with correct background colors', () => {
    const { container } = render(<ColorPalette />);
    const swatches = container.querySelectorAll('.h-24');
    expect(swatches.length).toBeGreaterThan(0);

    const charcoalSwatch = Array.from(swatches).find(
      el => (el as HTMLElement).style.backgroundColor === 'rgb(20, 21, 23)'
    );
    expect(charcoalSwatch).toBeTruthy();
  });

  it('renders as a grid layout', () => {
    const { container } = render(<ColorPalette />);
    const grids = container.querySelectorAll('.grid');
    expect(grids.length).toBe(5);
  });
});
