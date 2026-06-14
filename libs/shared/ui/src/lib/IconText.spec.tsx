import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { IconText } from './IconText';

expect.extend(toHaveNoViolations);

const TestIcon = () => <svg data-testid='icon' aria-hidden='true' />;

describe('IconText', () => {
  it('renders children content', () => {
    render(<IconText icon={<TestIcon />}>Hello</IconText>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders the provided icon', () => {
    render(<IconText icon={<TestIcon />}>Hello</IconText>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('collapses the text line-box for optical centering', () => {
    render(<IconText icon={<TestIcon />}>Hello</IconText>);
    const el = screen.getByText('Hello');
    expect(el).toHaveClass('items-center');
    expect(el).toHaveClass('leading-none');
    expect(el).toHaveClass('inline-flex');
  });

  it('neutralizes block margins on text children to keep centering symmetric', () => {
    render(<IconText icon={<TestIcon />}>Hello</IconText>);
    expect(screen.getByText('Hello')).toHaveClass('[&>*]:my-0');
  });

  it('renders the icon before the text by default', () => {
    render(<IconText icon={<TestIcon />}>Hello</IconText>);
    const container = screen.getByText('Hello');
    const icon = screen.getByTestId('icon');
    // icon wrapper precedes the text node
    expect(container.firstElementChild?.contains(icon)).toBe(true);
  });

  it('renders the icon after the text when iconPosition is right', () => {
    render(
      <IconText icon={<TestIcon />} iconPosition='right'>
        Hello
      </IconText>
    );
    const container = screen.getByText('Hello');
    const icon = screen.getByTestId('icon');
    expect(container.lastElementChild?.contains(icon)).toBe(true);
  });

  it('applies custom className', () => {
    render(
      <IconText icon={<TestIcon />} className='custom-class'>
        Hello
      </IconText>
    );
    expect(screen.getByText('Hello')).toHaveClass('custom-class');
  });

  it('renders as a span by default', () => {
    render(<IconText icon={<TestIcon />}>Hello</IconText>);
    expect(screen.getByText('Hello').tagName).toBe('SPAN');
  });

  it('renders as a custom element via the as prop', () => {
    render(
      <IconText icon={<TestIcon />} as='div'>
        Hello
      </IconText>
    );
    expect(screen.getByText('Hello').tagName).toBe('DIV');
  });

  it('forwards a ref to the container element', () => {
    const ref = createRef<HTMLElement>();
    render(
      <IconText icon={<TestIcon />} ref={ref}>
        Hello
      </IconText>
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('SPAN');
  });

  it('hides the icon wrapper from assistive tech', () => {
    render(<IconText icon={<TestIcon />}>Hello</IconText>);
    const container = screen.getByText('Hello');
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <IconText icon={<TestIcon />}>Hello</IconText>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
