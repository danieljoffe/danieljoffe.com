import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Heading, type HeadingVariant } from './Heading';

const variantDefaults: Record<HeadingVariant, string> = {
  hero: 'h1',
  detail: 'h1',
  subtitle: 'h2',
  section: 'h2',
  cardTitle: 'h3',
  component: 'h3',
  mdxH1: 'h1',
  mdxH2: 'h2',
  mdxH3: 'h3',
  mdxH4: 'h4',
};

const variantClassSubstring: Record<HeadingVariant, string> = {
  hero: 'text-4xl',
  detail: 'text-3xl',
  subtitle: 'text-2xl',
  section: 'text-2xl',
  cardTitle: 'text-sm',
  component: 'text-lg',
  mdxH1: 'text-2xl',
  mdxH2: 'text-lg',
  mdxH3: 'text-sm',
  mdxH4: 'text-xs',
};

describe('Heading', () => {
  it('renders children content', () => {
    render(<Heading variant='hero'>Hello World</Heading>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  describe.each(Object.entries(variantDefaults))(
    'variant "%s"',
    (variant, expectedTag) => {
      it(`renders as <${expectedTag}> by default`, () => {
        const { container } = render(
          <Heading variant={variant as HeadingVariant}>Content</Heading>
        );
        expect(container.firstChild?.nodeName.toLowerCase()).toBe(expectedTag);
      });

      it('applies the correct variant classes', () => {
        const { container } = render(
          <Heading variant={variant as HeadingVariant}>Content</Heading>
        );
        expect(container.firstChild).toHaveClass(
          variantClassSubstring[variant as HeadingVariant]
        );
      });
    }
  );

  it('overrides the default element with the "as" prop', () => {
    const { container } = render(
      <Heading variant='hero' as='h3'>
        Override
      </Heading>
    );
    expect(container.firstChild?.nodeName.toLowerCase()).toBe('h3');
  });

  it('allows rendering as a <p> element', () => {
    const { container } = render(
      <Heading variant='cardTitle' as='p'>
        Paragraph heading
      </Heading>
    );
    expect(container.firstChild?.nodeName.toLowerCase()).toBe('p');
  });

  it('merges custom className with variant classes', () => {
    const { container } = render(
      <Heading variant='hero' className='custom-class'>
        Content
      </Heading>
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-4xl');
  });

  it('forwards ref to the underlying element', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Heading variant='hero' ref={ref}>
        Ref test
      </Heading>
    );
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('passes through additional HTML attributes', () => {
    render(
      <Heading variant='hero' data-testid='custom-heading' id='my-heading'>
        Attributes
      </Heading>
    );
    const el = screen.getByTestId('custom-heading');
    expect(el).toHaveAttribute('id', 'my-heading');
  });
});
