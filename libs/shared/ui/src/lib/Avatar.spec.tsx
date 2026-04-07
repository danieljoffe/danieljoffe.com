import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
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
    expect(container.querySelector('.h-10')).toBeInTheDocument();
  });

  it('applies sm size styles', () => {
    const { container } = render(<Avatar initials='A' size='sm' />);
    expect(container.querySelector('.h-8')).toBeInTheDocument();
  });

  it('applies lg size styles', () => {
    const { container } = render(<Avatar initials='A' size='lg' />);
    expect(container.querySelector('.h-12')).toBeInTheDocument();
  });

  it('renders status indicator when status is provided', () => {
    const { container } = render(<Avatar initials='A' status='online' />);
    expect(container.querySelector('.bg-success')).toBeInTheDocument();
  });

  it('does not render status indicator when no status', () => {
    const { container } = render(<Avatar initials='A' />);
    expect(container.querySelector('.bg-success')).not.toBeInTheDocument();
    expect(container.querySelector('.bg-error')).not.toBeInTheDocument();
  });

  it('applies busy status color', () => {
    const { container } = render(<Avatar initials='A' status='busy' />);
    expect(container.querySelector('.bg-error')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Avatar initials='A' className='custom-class' />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
