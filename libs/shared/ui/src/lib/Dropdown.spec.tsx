import { render, screen, fireEvent } from '@testing-library/react';
import { Dropdown } from './Dropdown';

const items = [
  { label: 'Edit', onClick: jest.fn() },
  { label: 'Delete', onClick: jest.fn(), danger: true },
];

describe('Dropdown', () => {
  it('renders the trigger', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('does not show items initially', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('shows items when trigger is clicked', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides items when trigger is clicked again', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    fireEvent.click(screen.getByText('Menu'));
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('calls onClick and closes when item is clicked', () => {
    const onClick = jest.fn();
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[{ label: 'Action', onClick }]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    fireEvent.click(screen.getByText('Action'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
  });

  it('renders divider items', () => {
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[
          { label: 'Edit', onClick: jest.fn() },
          { label: '', divider: true },
          { label: 'Delete', onClick: jest.fn() },
        ]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders disabled items', () => {
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[{ label: 'Disabled', disabled: true }]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Disabled').closest('button')).toBeDisabled();
  });

  it('applies danger styles to danger items', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Delete').closest('button')).toHaveClass(
      'text-error'
    );
  });

  it('closes when clicking outside', () => {
    render(
      <div>
        <Dropdown trigger={<span>Menu</span>} items={items} />
        <span>Outside</span>
      </div>
    );
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('applies right alignment when specified', () => {
    render(
      <Dropdown trigger={<span>Menu</span>} items={items} align='right' />
    );
    fireEvent.click(screen.getByText('Menu'));
    const dropdown = screen.getByText('Edit').closest('.right-0');
    expect(dropdown).toBeInTheDocument();
  });
});
