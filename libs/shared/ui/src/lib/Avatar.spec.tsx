import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Avatar } from './Avatar';

expect.extend(toHaveNoViolations);

describe('Avatar', () => {
  it('forwards ref and spreads rest props to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Avatar ref={ref} data-testid='avatar-root' title='avatar' />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute('data-testid', 'avatar-root');
    expect(ref.current).toHaveAttribute('title', 'avatar');
  });

  it('renders initials when no src provided', () => {
    render(<Avatar initials='DJ' />);
    expect(screen.getByText('DJ')).toBeInTheDocument();
  });

  it('renders first character of alt when no initials or src', () => {
    render(<Avatar alt='Daniel' />);
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('renders fallback ? when no src, initials, or alt', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders an img when src is provided', () => {
    render(<Avatar src='/photo.jpg' alt='Photo' />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/photo.jpg');
    expect(img).toHaveAttribute('alt', 'Photo');
  });

  it('applies md size by default', () => {
    const { container } = render(<Avatar initials='A' />);
    const inner = (container.firstChild as HTMLElement).firstElementChild!;
    expect(inner).toHaveClass('h-10');
  });

  it('applies sm size styles', () => {
    const { container } = render(<Avatar initials='A' size='sm' />);
    const inner = (container.firstChild as HTMLElement).firstElementChild!;
    expect(inner).toHaveClass('h-8');
  });

  it('applies lg size styles', () => {
    const { container } = render(<Avatar initials='A' size='lg' />);
    const inner = (container.firstChild as HTMLElement).firstElementChild!;
    expect(inner).toHaveClass('h-12');
  });

  it('renders status indicator when status is provided', () => {
    const { container } = render(<Avatar initials='A' status='online' />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.children).toHaveLength(2);
    expect(wrapper.lastElementChild).toHaveClass('bg-success');
  });

  it('does not render status indicator when no status', () => {
    const { container } = render(<Avatar initials='A' />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.children).toHaveLength(1);
  });

  it('applies busy status color', () => {
    const { container } = render(<Avatar initials='A' status='busy' />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.lastElementChild).toHaveClass('bg-error');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Avatar initials='A' className='custom-class' />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Avatar initials='DJ' />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
