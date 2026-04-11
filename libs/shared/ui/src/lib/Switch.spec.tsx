import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders switch element', () => {
    render(<Switch checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(
      <Switch
        checked={false}
        onChange={() => {}}
        label='Enable notifications'
      />
    );
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('renders as checked when checked is true', () => {
    render(<Switch checked={true} onChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('renders as unchecked when checked is false', () => {
    render(<Switch checked={false} onChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });

  it('applies checked styles when checked', () => {
    render(<Switch checked={true} onChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('bg-brand-500');
  });

  it('applies unchecked styles when not checked', () => {
    render(<Switch checked={false} onChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('bg-border-strong');
  });

  it('calls onChange with opposite value when clicked', () => {
    const handleChange = jest.fn();
    render(<Switch checked={false} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when checked switch is clicked', () => {
    const handleChange = jest.fn();
    render(<Switch checked={true} onChange={handleChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('can be disabled', () => {
    render(<Switch checked={false} onChange={() => {}} disabled />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDisabled();
  });

  it('does not call onChange when disabled', () => {
    const handleChange = jest.fn();
    render(<Switch checked={false} onChange={handleChange} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('applies disabled opacity styles', () => {
    render(<Switch checked={false} onChange={() => {}} disabled />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('disabled:opacity-50');
  });

  it('has type button to prevent form submission', () => {
    render(<Switch checked={false} onChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('type', 'button');
  });

  it('positions thumb at translate-x-6 when checked', () => {
    const { container } = render(<Switch checked={true} onChange={() => {}} />);
    const thumb = container.querySelector('span');
    expect(thumb).toHaveClass('translate-x-6');
  });

  it('positions thumb at translate-x-1 when unchecked', () => {
    const { container } = render(
      <Switch checked={false} onChange={() => {}} />
    );
    const thumb = container.querySelector('span');
    expect(thumb).toHaveClass('translate-x-1');
  });

  it('applies disabled styles to label when disabled', () => {
    render(
      <Switch
        checked={false}
        onChange={() => {}}
        label='Notifications'
        disabled
      />
    );
    const label = screen.getByText('Notifications');
    expect(label).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  describe('reduced motion', () => {
    it('applies motion-reduce:transition-none to switch track', () => {
      render(<Switch checked={false} onChange={() => {}} />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('motion-reduce:transition-none');
    });

    it('applies motion-reduce:transition-none to switch thumb', () => {
      const { container } = render(
        <Switch checked={false} onChange={() => {}} />
      );
      const thumb = container.querySelector('span');
      expect(thumb).toHaveClass('motion-reduce:transition-none');
    });
  });

  describe('accessibility', () => {
    it('has focus-visible ring styles', () => {
      render(<Switch checked={false} onChange={() => {}} />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('focus-visible:ring-2');
    });

    it('is labelled by adjacent text', () => {
      render(<Switch checked={false} onChange={() => {}} label='Dark mode' />);
      expect(screen.getByText('Dark mode')).toBeVisible();
    });
  });
});
