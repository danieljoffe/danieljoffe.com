import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './Checkbox';

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

  it('generates id from label when id not provided', () => {
    render(<Checkbox label='Accept Terms' />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('id', 'accept-terms');
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
    const labelElement = container.querySelector('label');
    expect(labelElement).toHaveClass('custom-class');
  });

  it('passes through additional input props', () => {
    render(<Checkbox name='terms' data-testid='terms-checkbox' />);
    const checkbox = screen.getByTestId('terms-checkbox');
    expect(checkbox).toHaveAttribute('name', 'terms');
  });
});
