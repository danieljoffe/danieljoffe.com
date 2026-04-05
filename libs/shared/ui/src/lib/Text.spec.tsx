import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Text, type TextVariant } from './Text';

const variantDefaults: Record<TextVariant, string> = {
  body: 'p',
  bodyLg: 'p',
  subtitle: 'p',
  cardDescription: 'p',
  detail: 'p',
  label: 'span',
  meta: 'span',
  caption: 'p',
  helper: 'p',
  error: 'p',
};

const variantClassSubstring: Record<TextVariant, string> = {
  body: 'text-sm',
  bodyLg: 'text-base',
  subtitle: 'text-lg',
  cardDescription: 'text-sm',
  detail: 'text-xs',
  label: 'text-xs',
  meta: 'text-xs',
  caption: 'text-sm',
  helper: 'text-sm',
  error: 'text-sm',
};

describe('Text', () => {
  it('renders children content', () => {
    render(<Text variant='body'>Hello World</Text>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  describe.each(Object.entries(variantDefaults))(
    'variant "%s"',
    (variant, expectedTag) => {
      it(`renders as <${expectedTag}> by default`, () => {
        const { container } = render(
          <Text variant={variant as TextVariant}>Content</Text>
        );
        expect(container.firstChild?.nodeName.toLowerCase()).toBe(expectedTag);
      });

      it('applies the correct variant classes', () => {
        const { container } = render(
          <Text variant={variant as TextVariant}>Content</Text>
        );
        expect(container.firstChild).toHaveClass(
          variantClassSubstring[variant as TextVariant]
        );
      });
    }
  );

  it('overrides the default element with the "as" prop', () => {
    const { container } = render(
      <Text variant='body' as='span'>
        Override
      </Text>
    );
    expect(container.firstChild?.nodeName.toLowerCase()).toBe('span');
  });

  it('allows rendering as a <div> element', () => {
    const { container } = render(
      <Text variant='body' as='div'>
        Div text
      </Text>
    );
    expect(container.firstChild?.nodeName.toLowerCase()).toBe('div');
  });

  it('allows rendering as a <label> element', () => {
    const { container } = render(
      <Text variant='label' as='label'>
        Label text
      </Text>
    );
    expect(container.firstChild?.nodeName.toLowerCase()).toBe('label');
  });

  it('merges custom className with variant classes', () => {
    const { container } = render(
      <Text variant='body' className='custom-class'>
        Content
      </Text>
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-sm');
  });

  it('forwards ref to the underlying element', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Text variant='body' ref={ref}>
        Ref test
      </Text>
    );
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it('passes through additional HTML attributes', () => {
    render(
      <Text variant='body' data-testid='custom-text' id='my-text'>
        Attributes
      </Text>
    );
    const el = screen.getByTestId('custom-text');
    expect(el).toHaveAttribute('id', 'my-text');
  });

  it('applies error-specific styles for the error variant', () => {
    const { container } = render(<Text variant='error'>Error message</Text>);
    expect(container.firstChild).toHaveClass('text-error');
  });
});
