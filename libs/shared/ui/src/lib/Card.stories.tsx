import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';

const meta = {
  title: 'Data Display/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    elevated: {
      description: 'Adds elevated shadow effect',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    padding: {
      description: 'Padding size inside the card',
      control: 'select',
      options: [undefined, 'none', 'sm', 'md', 'lg'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    children: {
      description: 'Card content',
      control: 'text',
    },
  },
} satisfies Meta<typeof Card>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Card content goes here',
  },
};

export const Elevated: Story = {
  args: {
    children: 'Elevated card content',
    elevated: true,
  },
};

export const NoPadding: Story = {
  args: {
    children: 'Card without padding',
    padding: 'none',
  },
};

export const LargePadding: Story = {
  args: {
    children: 'Card with large padding',
    padding: 'lg',
  },
};

export const FullCard: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        This is the card content area where you can place any content.
      </CardContent>
      <CardFooter>
        <Button size='sm'>Save</Button>
        <Button size='sm' variant='ghost'>
          Cancel
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const HeaderDefault: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <CardHeader>Card Header Content</CardHeader>
    </Card>
  ),
};

export const TitleDefault: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
    </Card>
  ),
};

export const ContentDefault: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <CardContent>
        This is the card content area where you can place any content.
      </CardContent>
    </Card>
  ),
};

export const FooterDefault: Story = {
  args: { children: null },
  render: () => (
    <Card>
      <CardContent>Content above the footer.</CardContent>
      <CardFooter>
        <Button size='sm'>Action</Button>
      </CardFooter>
    </Card>
  ),
};
