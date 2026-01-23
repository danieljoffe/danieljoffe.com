import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders switch element', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(
      <Switch
        checked={false}
        onCheckedChange={() => {}}
        label='Enable notifications'
      />
    );
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('renders as checked when checked is true', () => {
    render(<Switch checked={true} onCheckedChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('renders as unchecked when checked is false', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });

  it('applies checked styles when checked', () => {
    render(<Switch checked={true} onCheckedChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('bg-accent');
  });

  it('applies unchecked styles when not checked', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('bg-border-strong');
  });

  it('calls onCheckedChange with opposite value when clicked', () => {
    const handleChange = jest.fn();
    render(<Switch checked={false} onCheckedChange={handleChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('calls onCheckedChange with false when checked switch is clicked', () => {
    const handleChange = jest.fn();
    render(<Switch checked={true} onCheckedChange={handleChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('can be disabled', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} disabled />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDisabled();
  });

  it('does not call onCheckedChange when disabled', () => {
    const handleChange = jest.fn();
    render(<Switch checked={false} onCheckedChange={handleChange} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('applies disabled opacity styles', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} disabled />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('disabled:opacity-50');
  });

  it('has type button to prevent form submission', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('type', 'button');
  });
});
