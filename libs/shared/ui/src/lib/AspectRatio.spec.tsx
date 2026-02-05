import { render, screen } from '@testing-library/react';
import { AspectRatio } from './AspectRatio';

describe('AspectRatio', () => {
  it('renders children', () => {
    render(
      <AspectRatio>
        <div>Child Content</div>
      </AspectRatio>
    );
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('applies relative positioning', () => {
    const { container } = render(
      <AspectRatio>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveClass('relative');
  });

  it('applies full width', () => {
    const { container } = render(
      <AspectRatio>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('applies default ratio (16/9) via style', () => {
    const { container } = render(
      <AspectRatio>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveStyle({ aspectRatio: '16/9' });
  });

  it('applies 1/1 ratio', () => {
    const { container } = render(
      <AspectRatio ratio='1/1'>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveStyle({ aspectRatio: '1/1' });
  });

  it('applies 4/3 ratio', () => {
    const { container } = render(
      <AspectRatio ratio='4/3'>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveStyle({ aspectRatio: '4/3' });
  });

  it('applies 21/9 ratio', () => {
    const { container } = render(
      <AspectRatio ratio='21/9'>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveStyle({ aspectRatio: '21/9' });
  });

  it('applies 3/4 ratio', () => {
    const { container } = render(
      <AspectRatio ratio='3/4'>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveStyle({ aspectRatio: '3/4' });
  });

  it('applies 9/16 ratio', () => {
    const { container } = render(
      <AspectRatio ratio='9/16'>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveStyle({ aspectRatio: '9/16' });
  });

  it('applies custom className', () => {
    const { container } = render(
      <AspectRatio className='custom-class'>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders as a div element', () => {
    const { container } = render(
      <AspectRatio>
        <div>Content</div>
      </AspectRatio>
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
