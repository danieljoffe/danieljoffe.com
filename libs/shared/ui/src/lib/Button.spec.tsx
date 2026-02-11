import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, type ButtonVariant, type ButtonSize } from './Button';

describe('Button', () => {
  it('renders children content', () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole('button', { name: 'Click me' })
    ).toBeInTheDocument();
  });

  describe('variants', () => {
    it('applies primary variant by default', () => {
      render(<Button>Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-accent');
    });

    it.each([
      ['secondary', ['bg-background-elevated']],
      ['ghost', ['hover:bg-background-elevated']],
      ['outline', ['border-border-strong']],
      ['accent', ['bg-accent', 'text-accent-foreground']],
      ['success', ['bg-success']],
      ['error', ['bg-error']],
      ['warning', ['bg-warning']],
      ['info', ['bg-info']],
    ] as [ButtonVariant, string[]][])(
      'applies %s variant styles',
      (variant, expectedClasses) => {
        render(<Button variant={variant}>{variant}</Button>);
        expect(screen.getByRole('button')).toHaveClass(...expectedClasses);
      }
    );

    it('applies bare variant without background or border styles', () => {
      render(<Button variant='bare'>Bare</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('bg-accent');
      expect(button).not.toHaveClass('bg-background-elevated');
      expect(button).not.toHaveClass('border-border-strong');
    });
  });

  describe('sizes', () => {
    it('applies md size by default', () => {
      render(<Button>Medium</Button>);
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-3');
    });

    it.each([
      ['sm', ['px-3', 'py-1.5', 'text-sm']],
      ['lg', ['px-6', 'py-3', 'text-lg']],
    ] as [ButtonSize, string[]][])(
      'applies %s size styles',
      (size, expectedClasses) => {
        render(<Button size={size}>{size}</Button>);
        expect(screen.getByRole('button')).toHaveClass(...expectedClasses);
      }
    );
  });

  describe('interaction', () => {
    it('fires onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire onClick when disabled', () => {
      const handleClick = jest.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('props', () => {
    it('applies disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('merges custom className with variant and size styles', () => {
      render(
        <Button variant='secondary' size='lg' className='custom-class'>
          Merged
        </Button>
      );
      expect(screen.getByRole('button')).toHaveClass(
        'bg-background-elevated',
        'px-6',
        'text-lg',
        'custom-class'
      );
    });

    it('passes through additional HTML attributes', () => {
      render(
        <Button type='submit' data-testid='submit-btn'>
          Submit
        </Button>
      );
      expect(screen.getByTestId('submit-btn')).toHaveAttribute(
        'type',
        'submit'
      );
    });

    it('forwards ref to the button element', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('sets displayName for debugging', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  describe('accessibility', () => {
    it('renders as an HTML button element', () => {
      render(<Button>Element</Button>);
      expect(screen.getByRole('button').tagName).toBe('BUTTON');
    });

    it('has focus-visible ring styles', () => {
      render(<Button>Focus</Button>);
      expect(screen.getByRole('button').className).toContain(
        'focus-visible:ring-2'
      );
    });

    it('supports aria-label for icon-only buttons', () => {
      render(
        <Button aria-label='Close'>
          <span>×</span>
        </Button>
      );
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });
});
