import { render } from '@testing-library/react';
import { Spacer } from './Spacer';

describe('Spacer', () => {
  it('renders with default size (md)', () => {
    const { container } = render(<Spacer />);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).toHaveClass('h-8');
  });

  it('renders with xs size', () => {
    const { container } = render(<Spacer size='xs' />);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).toHaveClass('h-2');
  });

  it('renders with sm size', () => {
    const { container } = render(<Spacer size='sm' />);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).toHaveClass('h-4');
  });

  it('renders with md size', () => {
    const { container } = render(<Spacer size='md' />);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).toHaveClass('h-8');
  });

  it('renders with lg size', () => {
    const { container } = render(<Spacer size='lg' />);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).toHaveClass('h-12');
  });

  it('renders with xl size', () => {
    const { container } = render(<Spacer size='xl' />);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).toHaveClass('h-16');
  });

  it('renders with 2xl size', () => {
    const { container } = render(<Spacer size='2xl' />);
    const spacer = container.firstChild as HTMLElement;
    expect(spacer).toHaveClass('h-24');
  });

  it('renders as a div element', () => {
    const { container } = render(<Spacer />);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
