import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid, GridItem } from './Grid';

const meta: Meta<typeof Grid> = {
  title: 'Layout/Grid',
  component: Grid,
  tags: ['autodocs'],
  argTypes: {
    cols: {
      description: 'Number of columns in the grid',
      control: 'select',
      options: [1, 2, 3, 4, 6, 12],
      table: {
        defaultValue: { summary: '12' },
      },
    },
    gap: {
      description: 'Gap between grid items',
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Grid>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className='bg-accent text-accent-foreground p-4 rounded text-center'>
    {children}
  </div>
);

export const TwoColumns: Story = {
  args: {
    cols: 2,
    gap: 'md',
    children: (
      <>
        <Box>Column 1</Box>
        <Box>Column 2</Box>
      </>
    ),
  },
};

export const ThreeColumns: Story = {
  args: {
    cols: 3,
    gap: 'md',
    children: (
      <>
        <Box>Column 1</Box>
        <Box>Column 2</Box>
        <Box>Column 3</Box>
      </>
    ),
  },
};

export const FourColumns: Story = {
  args: {
    cols: 4,
    gap: 'md',
    children: (
      <>
        <Box>Col 1</Box>
        <Box>Col 2</Box>
        <Box>Col 3</Box>
        <Box>Col 4</Box>
      </>
    ),
  },
};

export const WithGridItems: Story = {
  args: {
    cols: 12,
    gap: 'md',
    children: (
      <>
        <GridItem colSpan={6}>
          <Box>Half Width (6 cols)</Box>
        </GridItem>
        <GridItem colSpan={6}>
          <Box>Half Width (6 cols)</Box>
        </GridItem>
        <GridItem colSpan={4}>
          <Box>Third (4 cols)</Box>
        </GridItem>
        <GridItem colSpan={4}>
          <Box>Third (4 cols)</Box>
        </GridItem>
        <GridItem colSpan={4}>
          <Box>Third (4 cols)</Box>
        </GridItem>
        <GridItem colSpan={12}>
          <Box>Full Width (12 cols)</Box>
        </GridItem>
      </>
    ),
  },
};

export const SmallGap: Story = {
  args: {
    cols: 3,
    gap: 'sm',
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
        <Box>Item 4</Box>
        <Box>Item 5</Box>
        <Box>Item 6</Box>
      </>
    ),
  },
};

export const LargeGap: Story = {
  args: {
    cols: 3,
    gap: 'lg',
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
      </>
    ),
  },
};

export const NoGap: Story = {
  args: {
    cols: 4,
    gap: 'none',
    children: (
      <>
        <Box>1</Box>
        <Box>2</Box>
        <Box>3</Box>
        <Box>4</Box>
      </>
    ),
  },
};
