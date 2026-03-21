import type { Meta, StoryObj } from '@storybook/react-vite';
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
};

export const Clickable: Story = {
  args: {
    columns,
    data: sampleData,
    onRowClick: (row: User) => alert(`Clicked: ${row.name}`),
  },
};
