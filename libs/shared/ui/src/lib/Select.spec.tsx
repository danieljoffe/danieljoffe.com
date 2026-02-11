import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

const defaultOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders select element', () => {
    render(<Select options={defaultOptions} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select options={defaultOptions} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Select label='Country' options={defaultOptions} />);
    expect(screen.getByText('Country')).toBeInTheDocument();
  });

  it('associates label with select', () => {
    render(<Select label='Country' options={defaultOptions} />);
    const select = screen.getByRole('combobox');
    const label = screen.getByText('Country');
    expect(label).toHaveAttribute('for', select.id);
  });

  it('generates id from label when id not provided', () => {
    render(<Select label='Select Country' options={defaultOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('id', 'select-country');
  });

  it('uses provided id over generated one', () => {
    render(<Select id='custom-id' label='Country' options={defaultOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('id', 'custom-id');
  });

  it('renders error message when provided', () => {
    render(<Select options={defaultOptions} error='Please select an option' />);
    expect(screen.getByText('Please select an option')).toBeInTheDocument();
  });

  it('applies error styles when error is provided', () => {
    render(<Select options={defaultOptions} error='Error' />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('border-error');
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Select options={defaultOptions} onChange={handleChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Select options={defaultOptions} disabled />);
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Select options={defaultOptions} className='custom-class' />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-class');
  });

  it('renders with default value', () => {
    render(<Select options={defaultOptions} defaultValue='option2' />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });

  it('passes through additional select props', () => {
    render(
      <Select
        options={defaultOptions}
        name='country'
        data-testid='country-select'
      />
    );
    const select = screen.getByTestId('country-select');
    expect(select).toHaveAttribute('name', 'country');
  });

  describe('accessibility', () => {
    it('sets aria-invalid="true" when error is present', () => {
      render(<Select options={defaultOptions} error='Required' />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });

    it('links select to error via aria-describedby', () => {
      render(
        <Select id='test-select' options={defaultOptions} error='Required' />
      );
      const select = screen.getByRole('combobox');
      const errorId = select.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      expect(screen.getByRole('alert')).toHaveAttribute('id', errorId);
    });

    it('renders error message with role="alert"', () => {
      render(<Select options={defaultOptions} error='Required field' />);
      expect(screen.getByRole('alert')).toHaveTextContent('Required field');
    });
  });

  it('renders with empty options array', () => {
    render(<Select options={[]} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll('option')).toHaveLength(0);
  });
});
