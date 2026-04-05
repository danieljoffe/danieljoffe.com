import { render, screen } from '@testing-library/react';
import { Kbd } from './Kbd';

describe('Kbd', () => {
  it('renders the key text', () => {
    render(<Kbd>D</Kbd>);
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('renders as a kbd element', () => {
    render(<Kbd>D</Kbd>);
    expect(screen.getByText('D').tagName).toBe('KBD');
  });

  it('applies custom className', () => {
    render(<Kbd className='visible'>D</Kbd>);
    expect(screen.getByText('D')).toHaveClass('visible');
  });
});
