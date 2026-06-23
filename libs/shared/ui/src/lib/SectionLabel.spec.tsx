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

  it('renders the label as a level-2 heading by default', () => {
    render(<SectionLabel icon={<span>icon</span>} label='About' />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'About' })
    ).toBeInTheDocument();
  });

  it('renders a level-3 heading for a nested section', () => {
    render(<SectionLabel icon={<span>icon</span>} label='Nested' as='h3' />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Nested' })
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SectionLabel icon={<span>icon</span>} label='Test' className='mt-4' />
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
