import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Table } from './Table';

type Row = { id: number; name: string; age: number; role: string };

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'age', header: 'Age', align: 'center' as const },
  { key: 'role', header: 'Role' },
];

const data: Row[] = [
  { id: 1, name: 'Alice', age: 30, role: 'Engineer' },
  { id: 2, name: 'Bob', age: 25, role: 'Designer' },
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

  // --- scope="col" on th elements ---

  it('renders scope="col" on all header th elements', () => {
    render(<Table columns={columns} data={data} />);
    const headers = screen.getAllByRole('columnheader');
    headers.forEach(th => {
      expect(th).toHaveAttribute('scope', 'col');
    });
  });

  // --- caption prop ---

  it('renders a caption element when caption prop is provided', () => {
    render(<Table columns={columns} data={data} caption='User list' />);
    const caption = screen.getByText('User list');
    expect(caption.tagName).toBe('CAPTION');
  });

  it('does not render a caption element when caption prop is omitted', () => {
    const { container } = render(<Table columns={columns} data={data} />);
    expect(container.querySelector('caption')).toBeNull();
  });

  // --- aria-label on table ---

  it('renders aria-label on the table when ariaLabel is provided and no caption', () => {
    render(<Table columns={columns} data={data} ariaLabel='User data' />);
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label', 'User data');
  });

  it('does not render aria-label when caption is provided', () => {
    render(
      <Table
        columns={columns}
        data={data}
        caption='User list'
        ariaLabel='User data'
      />
    );
    const table = screen.getByRole('table');
    expect(table).not.toHaveAttribute('aria-label');
  });

  // --- keyboard accessibility for clickable rows ---

  it('adds tabIndex={0} and role="button" on rows when onRowClick is provided', () => {
    render(<Table columns={columns} data={data} onRowClick={jest.fn()} />);
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(2);
    rows.forEach(row => {
      expect(row.tagName).toBe('TR');
      expect(row).toHaveAttribute('tabindex', '0');
    });
  });

  it('does not add tabIndex or role on rows when onRowClick is not provided', () => {
    render(<Table columns={columns} data={data} />);
    const rows = screen.getAllByRole('row');
    // body rows should not have tabindex or role="button"
    const bodyRows = rows.slice(1);
    bodyRows.forEach(row => {
      expect(row).not.toHaveAttribute('tabindex');
      expect(row).not.toHaveAttribute('role', 'button');
    });
  });

  it('triggers onRowClick on Enter keypress', () => {
    const onRowClick = jest.fn();
    render(<Table columns={columns} data={data} onRowClick={onRowClick} />);
    const rows = screen.getAllByRole('button');
    fireEvent.keyDown(rows[0], { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('triggers onRowClick on Space keypress', () => {
    const onRowClick = jest.fn();
    render(<Table columns={columns} data={data} onRowClick={onRowClick} />);
    const rows = screen.getAllByRole('button');
    fireEvent.keyDown(rows[0], { key: ' ' });
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('does not trigger onRowClick on other key presses', () => {
    const onRowClick = jest.fn();
    render(<Table columns={columns} data={data} onRowClick={onRowClick} />);
    const rows = screen.getAllByRole('button');
    fireEvent.keyDown(rows[0], { key: 'Tab' });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('prevents default on Enter/Space to avoid page scroll', () => {
    const onRowClick = jest.fn();
    render(<Table columns={columns} data={data} onRowClick={onRowClick} />);
    const rows = screen.getAllByRole('button');
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
    });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    rows[0].dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  // --- aria-label on clickable rows ---

  it('renders aria-label on clickable rows when getRowAriaLabel is provided', () => {
    render(
      <Table
        columns={columns}
        data={data}
        onRowClick={jest.fn()}
        getRowAriaLabel={row => `View ${row.name}`}
      />
    );
    const rows = screen.getAllByRole('button');
    expect(rows[0]).toHaveAttribute('aria-label', 'View Alice');
    expect(rows[1]).toHaveAttribute('aria-label', 'View Bob');
  });

  it('does not render aria-label on rows when getRowAriaLabel is not provided', () => {
    render(<Table columns={columns} data={data} onRowClick={jest.fn()} />);
    const rows = screen.getAllByRole('button');
    rows.forEach(row => {
      expect(row).not.toHaveAttribute('aria-label');
    });
  });

  // --- rowKey prop ---

  it('uses rowKey for unique keys when provided', () => {
    const { container } = render(
      <Table columns={columns} data={data} rowKey={row => row.id as number} />
    );
    // Verify rows render correctly (key usage is internal to React,
    // but we can verify no warnings and correct rendering)
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  // --- focus-visible styles on clickable rows ---

  it('applies focus-visible outline class on clickable rows', () => {
    render(<Table columns={columns} data={data} onRowClick={jest.fn()} />);
    const rows = screen.getAllByRole('button');
    rows.forEach(row => {
      expect(row.className).toContain('focus-visible:outline-2');
    });
  });

  it('does not apply focus-visible outline class on non-clickable rows', () => {
    render(<Table columns={columns} data={data} />);
    const rows = screen.getAllByRole('row');
    const bodyRows = rows.slice(1);
    bodyRows.forEach(row => {
      expect(row.className).not.toContain('focus-visible:outline-2');
    });
  });

  it('forwards ref and spreads rest props to the wrapper element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Table columns={columns} data={data} ref={ref} data-testid='table-root' />
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute('data-testid', 'table-root');
  });

  it('uses a defined focus-ring token on clickable rows (not the phantom accent)', () => {
    render(<Table columns={columns} data={data} onRowClick={jest.fn()} />);
    const row = screen.getAllByRole('button')[0];
    expect(row.className).toContain('focus-visible:outline-brand-500');
    expect(row.className).not.toContain('outline-accent');
  });

  describe('sortable columns', () => {
    const sortableColumns = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'age', header: 'Age', sortable: true },
      { key: 'role', header: 'Role' },
    ];

    it('renders a header button only for sortable columns', () => {
      render(<Table columns={sortableColumns} data={data} />);
      expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Age' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Role' })
      ).not.toBeInTheDocument();
    });

    it('defaults aria-sort to "none" on unsorted sortable columns and omits it on non-sortable', () => {
      render(<Table columns={sortableColumns} data={data} />);
      expect(
        screen.getByRole('columnheader', { name: /Name/ })
      ).toHaveAttribute('aria-sort', 'none');
      expect(
        screen.getByRole('columnheader', { name: 'Role' })
      ).not.toHaveAttribute('aria-sort');
    });

    it('reflects sortKey + sortDirection as aria-sort ascending/descending', () => {
      const { rerender } = render(
        <Table
          columns={sortableColumns}
          data={data}
          sortKey='name'
          sortDirection='asc'
        />
      );
      expect(
        screen.getByRole('columnheader', { name: /Name/ })
      ).toHaveAttribute('aria-sort', 'ascending');
      rerender(
        <Table
          columns={sortableColumns}
          data={data}
          sortKey='name'
          sortDirection='desc'
        />
      );
      expect(
        screen.getByRole('columnheader', { name: /Name/ })
      ).toHaveAttribute('aria-sort', 'descending');
    });

    it('calls onSort with the column key when a sortable header is activated', () => {
      const onSort = jest.fn();
      render(<Table columns={sortableColumns} data={data} onSort={onSort} />);
      fireEvent.click(screen.getByRole('button', { name: 'Age' }));
      expect(onSort).toHaveBeenCalledWith('age');
    });
  });
});
