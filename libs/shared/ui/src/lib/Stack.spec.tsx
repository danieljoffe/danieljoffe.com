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

  it('applies custom className', () => {
    const { container } = render(
      <Stack className='custom-class'>
        <div>Child</div>
      </Stack>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  describe('polymorphic rendering', () => {
    it('renders as div by default', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it.each([
      ['ul', 'UL'],
      ['ol', 'OL'],
      ['nav', 'NAV'],
      ['section', 'SECTION'],
    ] as const)('renders as %s', (as, expected) => {
      const { container } = render(
        <Stack as={as}>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild?.nodeName).toBe(expected);
      expect(container.firstChild).toHaveClass('flex');
    });

    it('passes through additional HTML attributes', () => {
      render(
        <Stack as='ul' aria-label='Navigation list' data-testid='stack-list'>
          <li>Item</li>
        </Stack>
      );
      const list = screen.getByTestId('stack-list');
      expect(list).toHaveAttribute('aria-label', 'Navigation list');
    });
  });

  describe('direction', () => {
    it('renders vertical by default', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild).toHaveClass('flex-col');
    });

    it('renders horizontal', () => {
      const { container } = render(
        <Stack direction='horizontal'>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild).toHaveClass('flex-row');
    });
  });

  describe('gap', () => {
    it.each([
      ['none', 'gap-0'],
      ['xs', 'gap-1'],
      ['sm', 'gap-2'],
      ['md', 'gap-4'],
      ['lg', 'gap-6'],
      ['xl', 'gap-8'],
    ] as const)('applies %s gap', (gap, expected) => {
      const { container } = render(
        <Stack gap={gap}>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild).toHaveClass(expected);
    });

    it('defaults to md gap', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild).toHaveClass('gap-4');
    });
  });

  describe('align', () => {
    it.each([
      ['start', 'items-start'],
      ['center', 'items-center'],
      ['end', 'items-end'],
      ['stretch', 'items-stretch'],
    ] as const)('applies %s alignment', (align, expected) => {
      const { container } = render(
        <Stack align={align}>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild).toHaveClass(expected);
    });

    it('defaults to stretch', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild).toHaveClass('items-stretch');
    });
  });

  describe('justify', () => {
    it.each([
      ['start', 'justify-start'],
      ['center', 'justify-center'],
      ['end', 'justify-end'],
      ['between', 'justify-between'],
      ['around', 'justify-around'],
      ['evenly', 'justify-evenly'],
    ] as const)('applies %s justification', (justify, expected) => {
      const { container } = render(
        <Stack justify={justify}>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild).toHaveClass(expected);
    });

    it('defaults to start', () => {
      const { container } = render(
        <Stack>
          <div>Child</div>
        </Stack>
      );
      expect(container.firstChild).toHaveClass('justify-start');
    });
  });

  describe('wrap', () => {
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
  });
});
