import { render } from '@testing-library/react';
import { GridBg } from './GridBg';

describe('GridBg', () => {
  it('renders without crashing', () => {
    const { container } = render(<GridBg />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('is non-interactive (pointer-events-none)', () => {
    const { container } = render(<GridBg />);
    expect(container.firstChild).toHaveClass('pointer-events-none');
  });

  it('applies custom className', () => {
    const { container } = render(<GridBg className='z-0' />);
    expect(container.firstChild).toHaveClass('z-0');
  });
});
