import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from './Stack';

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  tags: ['autodocs'],
  argTypes: {
    direction: {
      description: 'The direction of the stack layout',
      control: 'radio',
      options: ['vertical', 'horizontal'],
      table: {
        defaultValue: { summary: 'vertical' },
      },
    },
    gap: {
      description: 'The spacing between items',
      control: 'select',
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    align: {
      description: 'Alignment of items along the cross axis',
      control: 'select',
      options: ['start', 'center', 'end', 'stretch'],
      table: {
        defaultValue: { summary: 'stretch' },
      },
    },
    justify: {
      description: 'Justification of items along the main axis',
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
      table: {
        defaultValue: { summary: 'start' },
      },
    },
    wrap: {
      description: 'Whether items should wrap to new lines',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Stack>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className='bg-accent text-accent-foreground p-4 rounded'>{children}</div>
);

export const Vertical: Story = {
  args: {
    direction: 'vertical',
    gap: 'md',
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
      </>
    ),
  },
};

export const Horizontal: Story = {
  args: {
    direction: 'horizontal',
    gap: 'md',
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
      </>
    ),
  },
};

export const CenteredHorizontal: Story = {
  args: {
    direction: 'horizontal',
    gap: 'md',
    align: 'center',
    justify: 'center',
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
      </>
    ),
  },
};

export const SpaceBetween: Story = {
  args: {
    direction: 'horizontal',
    gap: 'md',
    justify: 'between',
    children: (
      <>
        <Box>Left</Box>
        <Box>Right</Box>
      </>
    ),
  },
};

export const Wrapped: Story = {
  args: {
    direction: 'horizontal',
    gap: 'sm',
    wrap: true,
    children: (
      <>
        {Array.from({ length: 10 }, (_, i) => (
          <Box key={i}>Item {i + 1}</Box>
        ))}
      </>
    ),
  },
};
