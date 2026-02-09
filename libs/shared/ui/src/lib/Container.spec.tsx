import { render, screen } from '@testing-library/react';
import { Container } from './Container';

describe('Container', () => {
  it('renders children', () => {
    render(<Container>Container Content</Container>);
    expect(screen.getByText('Container Content')).toBeInTheDocument();
  });

  it('applies centering classes', () => {
    const { container } = render(<Container>Content</Container>);
    expect(container.firstChild).toHaveClass('mx-auto', 'w-full');
  });

  it('applies horizontal padding', () => {
    const { container } = render(<Container>Content</Container>);
    expect(container.firstChild).toHaveClass('px-4');
  });

  it('applies default size (full)', () => {
    const { container } = render(<Container>Content</Container>);
    expect(container.firstChild).toHaveClass('max-w-full');
  });

  it('applies sm size', () => {
    const { container } = render(<Container size='sm'>Content</Container>);
    expect(container.firstChild).toHaveClass('max-w-3xl');
  });

  it('applies md size', () => {
    const { container } = render(<Container size='md'>Content</Container>);
    expect(container.firstChild).toHaveClass('max-w-5xl');
  });

  it('applies lg size', () => {
    const { container } = render(<Container size='lg'>Content</Container>);
    expect(container.firstChild).toHaveClass('max-w-7xl');
  });

  it('applies xl size', () => {
    const { container } = render(<Container size='xl'>Content</Container>);
    expect(container.firstChild).toHaveClass('max-w-8xl');
  });

  it('applies full size', () => {
    const { container } = render(<Container size='full'>Content</Container>);
    expect(container.firstChild).toHaveClass('max-w-full');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Container className='custom-class'>Content</Container>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders as a div element', () => {
    const { container } = render(<Container>Content</Container>);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
