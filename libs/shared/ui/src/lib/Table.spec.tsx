import { render, screen, fireEvent } from '@testing-library/react';
import { Table } from './Table';

type Row = { name: string; age: number; role: string };

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'age', header: 'Age', align: 'center' as const },
  { key: 'role', header: 'Role' },
];

const data: Row[] = [
  { name: 'Alice', age: 30, role: 'Engineer' },
  { name: 'Bob', age: 25, role: 'Designer' },
];

describe('Table', () => {
  it('renders column headers', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<Table columns={columns} data={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = jest.fn();
    render(<Table columns={columns} data={data} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('applies cursor-pointer when onRowClick is provided', () => {
    render(<Table columns={columns} data={data} onRowClick={jest.fn()} />);
    const row = screen.getByText('Alice').closest('tr');
    expect(row).toHaveClass('cursor-pointer');
  });

  it('does not apply cursor-pointer without onRowClick', () => {
    render(<Table columns={columns} data={data} />);
    const row = screen.getByText('Alice').closest('tr');
    expect(row).not.toHaveClass('cursor-pointer');
  });

  it('renders custom cell content with render function', () => {
    const customColumns = [
      {
        key: 'name',
        header: 'Name',
        render: (row: Row) => <strong>{row.name}</strong>,
      },
    ];
    render(<Table columns={customColumns} data={data} />);
    const strong = screen.getByText('Alice');
    expect(strong.tagName).toBe('STRONG');
  });

  it('applies center alignment to header and cells', () => {
    render(<Table columns={columns} data={data} />);
    const ageHeader = screen.getByText('Age');
    expect(ageHeader).toHaveClass('text-center');
  });

  it('applies striped rows when enabled', () => {
    render(<Table columns={columns} data={data} striped />);
    const rows = screen.getAllByRole('row');
    // Row 0 is header, row 2 (index 1 in data) should have striped class
    expect(rows[2]).toHaveClass('bg-surface-secondary');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Table columns={columns} data={data} className='custom-class' />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
