import { render, screen } from '@testing-library/react';
import { Section } from './Section';

describe('Section', () => {
  it('renders children', () => {
    render(<Section>Section Content</Section>);
    expect(screen.getByText('Section Content')).toBeInTheDocument();
  });

  it('renders as a section element', () => {
    const { container } = render(<Section>Content</Section>);
    expect(container.firstChild?.nodeName).toBe('SECTION');
  });

  // Padding tests
  it('applies default padding (none)', () => {
    const { container } = render(<Section>Content</Section>);
    expect(container.firstChild).toHaveClass('py-0');
  });

  it('applies sm padding', () => {
    const { container } = render(<Section padding='sm'>Content</Section>);
    expect(container.firstChild).toHaveClass('py-4');
  });

  it('applies md padding', () => {
    const { container } = render(<Section padding='md'>Content</Section>);
    expect(container.firstChild).toHaveClass('py-8');
  });

  it('applies lg padding', () => {
    const { container } = render(<Section padding='lg'>Content</Section>);
    expect(container.firstChild).toHaveClass('py-12');
  });

  it('applies xl padding with responsive breakpoint', () => {
    const { container } = render(<Section padding='xl'>Content</Section>);
    expect(container.firstChild).toHaveClass('py-16', 'sm:py-24');
  });

  // Background tests
  it('applies no background by default', () => {
    const { container } = render(<Section>Content</Section>);
    expect(container.firstChild).not.toHaveClass('bg-background');
  });

  it('applies default background', () => {
    const { container } = render(
      <Section background='default'>Content</Section>
    );
    expect(container.firstChild).toHaveClass('bg-background');
  });

  it('applies alt background', () => {
    const { container } = render(<Section background='alt'>Content</Section>);
    expect(container.firstChild).toHaveClass('bg-background-alt');
  });

  it('applies elevated background', () => {
    const { container } = render(
      <Section background='elevated'>Content</Section>
    );
    expect(container.firstChild).toHaveClass('bg-background-elevated');
  });

  // Center tests
  it('applies centering by default', () => {
    const { container } = render(<Section>Content</Section>);
    expect(container.firstChild).toHaveClass('flex', 'justify-center');
  });

  it('removes centering when center=false', () => {
    const { container } = render(<Section center={false}>Content</Section>);
    expect(container.firstChild).not.toHaveClass('justify-center');
  });

  // Overflow tests
  it('applies hidden overflow by default', () => {
    const { container } = render(<Section>Content</Section>);
    expect(container.firstChild).toHaveClass('overflow-hidden');
  });

  it('applies visible overflow', () => {
    const { container } = render(<Section overflow='visible'>Content</Section>);
    expect(container.firstChild).toHaveClass('overflow-visible');
  });

  it('applies auto overflow', () => {
    const { container } = render(<Section overflow='auto'>Content</Section>);
    expect(container.firstChild).toHaveClass('overflow-auto');
  });

  // Full width tests
  it('applies full width by default', () => {
    const { container } = render(<Section>Content</Section>);
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('removes full width when fullWidth=false', () => {
    const { container } = render(<Section fullWidth={false}>Content</Section>);
    expect(container.firstChild).not.toHaveClass('w-full');
  });

  // Custom className test
  it('applies custom className', () => {
    const { container } = render(
      <Section className='custom-class'>Content</Section>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  // HTML attributes test
  it('passes through HTML attributes', () => {
    render(
      <Section aria-labelledby='section-heading' data-testid='test-section'>
        Content
      </Section>
    );
    const section = screen.getByTestId('test-section');
    expect(section).toHaveAttribute('aria-labelledby', 'section-heading');
  });

  // Combined test
  it('combines all classes correctly', () => {
    const { container } = render(
      <Section
        padding='lg'
        background='elevated'
        center={true}
        overflow='hidden'
      >
        Content
      </Section>
    );
    expect(container.firstChild).toHaveClass(
      'py-12',
      'bg-background-elevated',
      'flex',
      'justify-center',
      'overflow-hidden',
      'w-full'
    );
  });
});
