import type { Meta, StoryObj } from '@storybook/react-vite';
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
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Focus a row and press Enter
    const row = canvas.getByRole('button', { name: 'View Alice' });
    row.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onRowClick).toHaveBeenCalledWith(sampleData[0]);

    // Press Space on another row
    const bobRow = canvas.getByRole('button', { name: 'View Bob' });
    bobRow.focus();
    await userEvent.keyboard(' ');
    await expect(args.onRowClick).toHaveBeenCalledWith(sampleData[1]);
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
