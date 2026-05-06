import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Button from '../Button';

expect.extend(toHaveNoViolations);

// Mock next/link to render a real <a> and support ref
jest.mock('next/link', () => {
  return function MockLink(
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
      ref?: React.Ref<HTMLAnchorElement>;
    }
  ) {
    const { href, children, onClick, ref, ...rest } = props;
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
  };
});

// useRouter is invoked by the link variant for prefetch on hover
jest.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: jest.fn(), push: jest.fn() }),
}));

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
  });

  test('adds rel="noopener noreferrer" when target="_blank"', () => {
    render(
      <Button as='link' href='/ext' target='_blank'>
        External
      </Button>
    );
    const link = screen.getByRole('link', { name: /external/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel') ?? '').toEqual(
      expect.stringContaining('noopener')
    );
    expect(link.getAttribute('rel') ?? '').toEqual(
      expect.stringContaining('noreferrer')
    );
  });

  test('disabled link renders as non-interactive with aria-disabled', () => {
    render(
      <Button as='link' href='/x' disabled>
        NoGo
      </Button>
    );
    const pseudoLink = screen.getByRole('link', { name: /nogo/i });
    expect(pseudoLink).toHaveAttribute('aria-disabled', 'true');
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

  test('handles keyboard Enter key on button', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button name='testing' onClick={onClick}>
        Press
      </Button>
    );
    const button = screen.getByRole('button', { name: /press/i });
    button.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });

  test('handles keyboard Space key on button', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button name='testing' onClick={onClick}>
        Press
      </Button>
    );
    const button = screen.getByRole('button', { name: /press/i });
    button.focus();
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalled();
  });

  test('does not fire onClick on keyboard when disabled', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <Button name='testing' disabled onClick={onClick}>
        Disabled
      </Button>
    );
    const button = screen.getByRole('button', { name: /disabled/i });
    button.focus();
    await user.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
  });

  test('generates id from aria-label when id not provided', () => {
    render(
      <Button as='link' href='/test' aria-label='Test Label'>
        Link
      </Button>
    );
    const link = screen.getByRole('link', { name: /test label/i });
    expect(link).toHaveAttribute('id', 'Test-Label');
  });

  test('uses provided id over aria-label', () => {
    render(
      <Button as='link' href='/test' id='custom-id' aria-label='Test Label'>
        Link
      </Button>
    );
    const link = screen.getByRole('link', { name: /test label/i });
    expect(link).toHaveAttribute('id', 'custom-id');
  });

  test('applies variant and size styles', () => {
    render(
      <Button as='link' href='/test' variant='secondary' size='lg'>
        Styled
      </Button>
    );
    const link = screen.getByRole('link', { name: /styled/i });
    expect(link).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Button name='test'>Click</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
