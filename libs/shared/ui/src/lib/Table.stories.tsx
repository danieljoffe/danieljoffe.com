import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Badge } from './Badge';
import { Table } from './Table';

type User = { name: string; email: string; role: string; status: string };

const meta = {
  title: 'Data Display/Table',
  component: Table<User>,
  tags: ['autodocs'],
} satisfies Meta<typeof Table<User>>;
export default meta;

type Story = StoryObj<typeof meta>;

const sampleData: User[] = [
  {
    name: 'Alice',
    email: 'alice@example.com',
    role: 'Admin',
    status: 'Active',
  },
  { name: 'Bob', email: 'bob@example.com', role: 'User', status: 'Active' },
  {
    name: 'Carol',
    email: 'carol@example.com',
    role: 'Editor',
    status: 'Inactive',
  },
];

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'status', header: 'Status' },
];

export const Default: Story = {
  args: { columns, data: sampleData },
};

export const Striped: Story = {
  args: { columns, data: sampleData, striped: true },
};

// Controlled sorting: the Table renders aria-sort + the header controls; the
// consumer owns the sort order and re-sorts `data` in response to `onSort`.
export const Sortable: Story = {
  render: function SortableStory() {
    const [sortKey, setSortKey] = useState('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const sortableColumns = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Role', sortable: true },
      { key: 'status', header: 'Status', sortable: true },
    ];
    const sorted = [...sampleData].sort((a, b) => {
      const cmp = String(a[sortKey as keyof User]).localeCompare(
        String(b[sortKey as keyof User])
      );
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return (
      <Table
        columns={sortableColumns}
        data={sorted}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={key => {
          if (key === sortKey) {
            setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
          } else {
            setSortKey(key);
            setSortDirection('asc');
          }
        }}
        ariaLabel='Sortable users'
      />
    );
  },
};

export const Empty: Story = {
  args: { columns, data: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No data available')).toBeInTheDocument();
  },
};

export const Clickable: Story = {
  args: {
    columns,
    data: sampleData,
    onRowClick: fn(),
    rowKey: (row: User) => row.email,
    getRowAriaLabel: (row: User) => `View ${row.name}`,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Click a row
    const row = canvas.getByRole('button', { name: 'View Alice' });
    await userEvent.click(row);
    await expect(args.onRowClick).toHaveBeenCalledWith(sampleData[0]);
  },
};

export const RowKeyboardInteraction: Story = {
  args: {
    columns,
    data: sampleData,
    onRowClick: fn(),
    rowKey: (row: User) => row.email,
    getRowAriaLabel: (row: User) => `View ${row.name}`,
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Enter key triggers row click', async () => {
      const row = canvas.getByRole('button', { name: 'View Alice' });
      row.focus();
      await userEvent.keyboard('{Enter}');
      await expect(args.onRowClick).toHaveBeenCalledWith(sampleData[0]);
    });

    await step('Space key triggers row click', async () => {
      const bobRow = canvas.getByRole('button', { name: 'View Bob' });
      bobRow.focus();
      await userEvent.keyboard(' ');
      await expect(args.onRowClick).toHaveBeenCalledWith(sampleData[1]);
    });
  },
};

export const WithCaption: Story = {
  args: {
    columns,
    data: sampleData,
    caption: 'Team members and their roles',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Team members and their roles')
    ).toBeInTheDocument();
  },
};

export const WithAriaLabel: Story = {
  args: {
    columns,
    data: sampleData,
    ariaLabel: 'User management table',
  },
};

export const CustomColumnWidthAndAlign: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name', width: '200px' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Role', align: 'center' as const },
      { key: 'status', header: 'Status', align: 'right' as const },
    ],
    data: sampleData,
  },
};

export const CustomRender: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Role' },
      {
        key: 'status',
        header: 'Status',
        render: (row: User) => (
          <Badge variant={row.status === 'Active' ? 'success' : 'default'}>
            {row.status}
          </Badge>
        ),
      },
    ],
    data: sampleData,
  },
};
