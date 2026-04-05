import { render } from '@testing-library/react';
import { StructuredData } from './StructuredData';

describe('StructuredData', () => {
  it('renders a script tag with application/ld+json type', () => {
    const data = { '@type': 'WebPage', name: 'Test' };
    const { container } = render(<StructuredData data={data} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).toBeInTheDocument();
  });

  it('serializes data as JSON', () => {
    const data = { '@type': 'WebPage', name: 'Test' };
    const { container } = render(<StructuredData data={data} />);
    const script = container.querySelector('script');
    expect(script?.innerHTML).toContain('"@type"');
    expect(script?.innerHTML).toContain('"WebPage"');
  });

  it('escapes < characters for security', () => {
    const data = { name: '<script>alert("xss")</script>' };
    const { container } = render(<StructuredData data={data} />);
    const script = container.querySelector('script');
    expect(script?.innerHTML).not.toContain('<script>');
    expect(script?.innerHTML).toContain('\\u003c');
  });
});
