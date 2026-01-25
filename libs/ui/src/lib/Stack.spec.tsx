import { render, screen } from '@testing-library/react';
import { Stack } from './Stack';

describe('Stack', () => {
  it('renders children', () => {
    render(
      <Stack>
        <div>Child 1</div>
        <div>Child 2</div>
      </Stack>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('applies flex class', () => {
    const { container } = render(
      <Stack>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('flex');
  });

  it('renders vertical direction by default', () => {
    const { container } = render(
      <Stack>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('flex-col');
  });

  it('renders horizontal direction', () => {
    const { container } = render(
      <Stack direction='horizontal'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('flex-row');
  });

  it('applies default gap (md)', () => {
    const { container } = render(
      <Stack>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('gap-4');
  });

  it('applies no gap', () => {
    const { container } = render(
      <Stack gap='none'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('gap-0');
  });

  it('applies xs gap', () => {
    const { container } = render(
      <Stack gap='xs'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('gap-1');
  });

  it('applies lg gap', () => {
    const { container } = render(
      <Stack gap='lg'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('gap-6');
  });

  it('applies align start', () => {
    const { container } = render(
      <Stack align='start'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('items-start');
  });

  it('applies align center', () => {
    const { container } = render(
      <Stack align='center'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('items-center');
  });

  it('applies default align (stretch)', () => {
    const { container } = render(
      <Stack>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('items-stretch');
  });

  it('applies justify center', () => {
    const { container } = render(
      <Stack justify='center'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('justify-center');
  });

  it('applies justify between', () => {
    const { container } = render(
      <Stack justify='between'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('justify-between');
  });

  it('applies wrap when enabled', () => {
    const { container } = render(
      <Stack wrap>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('flex-wrap');
  });

  it('does not apply wrap by default', () => {
    const { container } = render(
      <Stack>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).not.toHaveClass('flex-wrap');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Stack className='custom-class'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
