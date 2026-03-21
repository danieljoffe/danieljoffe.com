import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid, GridItem } from './Grid';

const meta = {
  title: 'Layout/Grid',
  component: Grid,
  tags: ['autodocs'],
  argTypes: {
    as: {
      description:
        'The HTML element to render as. Supports semantic elements for accessibility.',
      control: 'select',
      options: ['div', 'ul', 'ol', 'section', 'article', 'aside', 'main'],
      table: {
        defaultValue: { summary: 'div' },
      },
    },
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
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className='bg-brand-500 text-text-inverse p-4 rounded text-center'>
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

export const AsUnorderedList: Story = {
  name: 'As Unordered List (ul)',
  args: {
    as: 'ul',
    cols: 2,
    gap: 'md',
    className: 'list-none',
    children: (
      <>
        <GridItem as='li'>
          <Box>List Item 1</Box>
        </GridItem>
        <GridItem as='li'>
          <Box>List Item 2</Box>
        </GridItem>
        <GridItem as='li'>
          <Box>List Item 3</Box>
        </GridItem>
        <GridItem as='li'>
          <Box>List Item 4</Box>
        </GridItem>
      </>
    ),
  },
};

export const AsOrderedList: Story = {
  name: 'As Ordered List (ol)',
  args: {
    as: 'ol',
    cols: 1,
    gap: 'sm',
    className: 'list-none',
    children: (
      <>
        <GridItem as='li'>
          <Box>Step 1: Plan your project</Box>
        </GridItem>
        <GridItem as='li'>
          <Box>Step 2: Build the components</Box>
        </GridItem>
        <GridItem as='li'>
          <Box>Step 3: Test and deploy</Box>
        </GridItem>
      </>
    ),
  },
};

export const CardGrid: Story = {
  name: 'Card Grid (ul with articles)',
  args: {
    as: 'ul',
    cols: 3,
    gap: 'lg',
    className: 'list-none',
    children: (
      <>
        <GridItem as='li'>
          <article className='bg-surface-elevated p-4 rounded border border-border'>
            <h3 className='mt-0'>Card Title 1</h3>
            <p>Card description goes here.</p>
          </article>
        </GridItem>
        <GridItem as='li'>
          <article className='bg-surface-elevated p-4 rounded border border-border'>
            <h3 className='mt-0'>Card Title 2</h3>
            <p>Card description goes here.</p>
          </article>
        </GridItem>
        <GridItem as='li'>
          <article className='bg-surface-elevated p-4 rounded border border-border'>
            <h3 className='mt-0'>Card Title 3</h3>
            <p>Card description goes here.</p>
          </article>
        </GridItem>
      </>
    ),
  },
};
