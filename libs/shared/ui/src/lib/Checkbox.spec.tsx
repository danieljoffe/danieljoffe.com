import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Checkbox } from './Checkbox';

expect.extend(toHaveNoViolations);

describe('Checkbox', () => {
  it('renders checkbox input', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Checkbox label='Accept terms' />);
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });

  it('associates label with checkbox', () => {
    render(<Checkbox label='Accept terms' />);
    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText('Accept terms');
    expect(label).toHaveAttribute('for', checkbox.id);
  });

  it('generates id when id not provided', () => {
    render(<Checkbox label='Accept Terms' />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('id');
    expect(checkbox.id).toBeTruthy();
  });

  it('uses provided id over generated one', () => {
    render(<Checkbox id='custom-id' label='Accept Terms' />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('id', 'custom-id');
  });

  it('renders checked state', () => {
    render(<Checkbox checked onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('renders unchecked state', () => {
    render(<Checkbox checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('calls onChange when clicked', () => {
    const handleChange = jest.fn();
    render(<Checkbox onChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Checkbox disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(<Checkbox className='custom-class' />);
    const visualSpan = container.querySelector('[aria-hidden="true"]');
    expect(visualSpan).toHaveClass('custom-class');
  });

  it('passes through additional input props', () => {
    render(<Checkbox name='terms' data-testid='terms-checkbox' />);
    const checkbox = screen.getByTestId('terms-checkbox');
    expect(checkbox).toHaveAttribute('name', 'terms');
  });

  it('renders Check icon when checked', () => {
    const { container } = render(<Checkbox checked onChange={() => {}} />);
    const checkIcon = container.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('does not render Check icon when unchecked', () => {
    const { container } = render(
      <Checkbox checked={false} onChange={() => {}} />
    );
    const checkIcon = container.querySelector('svg');
    expect(checkIcon).toBeNull();
  });

  it('applies sr-only class to input for screen reader accessibility', () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveClass('sr-only');
  });

  it('has aria-hidden="true" on visual label', () => {
    const { container } = render(<Checkbox label='Accept' />);
    const visualLabel = container.querySelector('[aria-hidden="true"]');
    expect(visualLabel).toBeInTheDocument();
  });

  it('applies disabled styles to label when disabled', () => {
    render(<Checkbox label='Accept terms' disabled />);
    const label = screen.getByText('Accept terms');
    expect(label).toHaveClass('opacity-50', 'cursor-not-allowed');
    expect(label).not.toHaveClass('cursor-pointer');
  });

  it('applies cursor-pointer to label when not disabled', () => {
    render(<Checkbox label='Accept terms' />);
    const label = screen.getByText('Accept terms');
    expect(label).toHaveClass('cursor-pointer');
  });

  describe('accessibility', () => {
    it('is accessible by label text', () => {
      render(<Checkbox label='Accept terms' />);
      expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
    });

    it('associates label with checkbox via matching IDs', () => {
      render(<Checkbox label='Accept terms' />);
      const checkbox = screen.getByRole('checkbox');
      const visibleLabel = screen.getByText('Accept terms');
      expect(visibleLabel.tagName).toBe('LABEL');
      expect(visibleLabel).toHaveAttribute('for', checkbox.id);
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Checkbox label='Accept' />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
