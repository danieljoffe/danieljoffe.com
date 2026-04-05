import { render, screen } from '@testing-library/react';
import { SectionLabel } from './SectionLabel';

describe('SectionLabel', () => {
  it('renders the label text', () => {
    render(<SectionLabel icon={<span>icon</span>} label='About' />);
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders the icon', () => {
    render(
      <SectionLabel icon={<span data-testid='icon'>★</span>} label='Test' />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SectionLabel icon={<span>icon</span>} label='Test' className='mt-4' />
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
