import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';
import { buttonLinkStyles, buttonStateStyles } from './button.constants';

// Mock next/link to render a real <a> and support ref
jest.mock('next/link', () => {
  const React = require('react');
  const MockLink = React.forwardRef(
    (
      props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string },
      ref: React.ForwardedRef<HTMLAnchorElement>
    ) => {
      const { href, children, onClick, ...rest } = props;
      return (
        <a
          ref={ref}
          href={href}
          onClick={e => {
            e.preventDefault();
            onClick?.(e);
          }}
          {...rest}
        >
          {children}
        </a>
      );
    }
  );

  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('Button component', () => {
  test('renders a native button by default with type="button"', () => {
    render(<Button name='testing'>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  test('respects provided button type', () => {
    render(
      <Button name='testing' type='submit'>
        Submit
      </Button>
    );
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
  });

  test('disabled button has disabled attribute and does not trigger onClick', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button name='testing' disabled onClick={onClick}>
        Disabled
      </Button>
    );
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    // visually disabled style should be present
    expect(button.className).toContain(buttonStateStyles.disabled);
  });

  test('renders a link when as="link" with href', () => {
    render(
      <Button as='link' href='/test'>
        Go
      </Button>
    );
    const link = screen.getByRole('link', { name: /go/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link.tagName.toLowerCase()).toBe('a');
  });

  test('adds rel="noopener noreferrer" when target="_blank"', () => {
    render(
      <Button as='link' href='/ext' target='_blank'>
        External
      </Button>
    );
    const link = screen.getByRole('link', { name: /external/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel') || '').toEqual(
      expect.stringContaining('noopener')
    );
    expect(link.getAttribute('rel') || '').toEqual(
      expect.stringContaining('noreferrer')
    );
  });

  test('disabled link renders as non-interactive span with aria-disabled', () => {
    render(
      <Button as='link' href='/x' disabled>
        NoGo
      </Button>
    );
    // When disabled, component renders a <span role="link">
    const pseudoLink = screen.getByRole('link', { name: /nogo/i });
    expect(pseudoLink.tagName.toLowerCase()).toBe('span');
    expect(pseudoLink).toHaveAttribute('aria-disabled', 'true');
    expect(pseudoLink).toHaveAttribute('tabindex', '-1');
  });

  test('highlighted link receives highlighted class', () => {
    render(
      <Button as='link' href='/hl' highlighted>
        Highlight
      </Button>
    );
    const link = screen.getByRole('link', { name: /highlight/i });
    expect(link.className).toContain(buttonLinkStyles.highlighted);
  });

  test('fires onClick for enabled button', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button name='testing' onClick={onClick}>
        Click
      </Button>
    );
    const button = screen.getByRole('button', { name: /click/i });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('fires onClick for enabled link', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button as='link' href='/ok' onClick={onClick}>
        Go
      </Button>
    );
    const link = screen.getByRole('link', { name: /go/i });
    await user.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
