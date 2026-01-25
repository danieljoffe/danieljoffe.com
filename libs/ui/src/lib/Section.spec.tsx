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

  it('applies default padding (md)', () => {
    const { container } = render(<Section>Content</Section>);
    expect(container.firstChild).toHaveClass('py-8');
  });

  it('applies no padding', () => {
    const { container } = render(<Section padding='none'>Content</Section>);
    expect(container.firstChild).toHaveClass('py-0');
  });

  it('applies sm padding', () => {
    const { container } = render(<Section padding='sm'>Content</Section>);
    expect(container.firstChild).toHaveClass('py-4');
  });

  it('applies lg padding', () => {
    const { container } = render(<Section padding='lg'>Content</Section>);
    expect(container.firstChild).toHaveClass('py-12');
  });

  it('applies xl padding', () => {
    const { container } = render(<Section padding='xl'>Content</Section>);
    expect(container.firstChild).toHaveClass('py-16');
  });

  it('applies default background', () => {
    const { container } = render(<Section>Content</Section>);
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

  it('applies custom className', () => {
    const { container } = render(
      <Section className='custom-class'>Content</Section>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('combines padding and background classes', () => {
    const { container } = render(
      <Section padding='lg' background='elevated'>
        Content
      </Section>
    );
    expect(container.firstChild).toHaveClass('py-12', 'bg-background-elevated');
  });
});
