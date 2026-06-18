import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from './Stack';

const meta = {
  title: 'Layout/Stack',
  component: Stack,
  tags: ['autodocs'],
  argTypes: {
    as: {
      description:
        'The HTML element to render as. Supports semantic elements for accessibility.',
      control: 'select',
      options: [
        'div',
        'ul',
        'ol',
        'nav',
        'section',
        'article',
        'aside',
        'main',
        'header',
        'footer',
      ],
      table: {
        defaultValue: { summary: 'div' },
      },
    },
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
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className='bg-brand-500 text-on-brand p-4 rounded'>{children}</div>
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

export const AsUnorderedList: Story = {
  name: 'As Unordered List (ul)',
  args: {
    as: 'ul',
    direction: 'vertical',
    gap: 'sm',
    className: 'list-none',
    children: (
      <>
        <li className='bg-brand-500 text-on-brand p-3 rounded'>First item</li>
        <li className='bg-brand-500 text-on-brand p-3 rounded'>Second item</li>
        <li className='bg-brand-500 text-on-brand p-3 rounded'>Third item</li>
      </>
    ),
  },
};

export const AsOrderedList: Story = {
  name: 'As Ordered List (ol)',
  args: {
    as: 'ol',
    direction: 'vertical',
    gap: 'sm',
    className: 'list-none',
    children: (
      <>
        <li className='bg-brand-500 text-on-brand p-3 rounded'>Step 1: Plan</li>
        <li className='bg-brand-500 text-on-brand p-3 rounded'>
          Step 2: Build
        </li>
        <li className='bg-brand-500 text-on-brand p-3 rounded'>
          Step 3: Deploy
        </li>
      </>
    ),
  },
};

export const AsNav: Story = {
  name: 'As Navigation (nav)',
  args: {
    as: 'nav',
    direction: 'horizontal',
    gap: 'md',
    align: 'center',
    children: (
      <>
        <a
          href='#'
          className='text-brand-600 dark:text-brand-400 hover:underline'
        >
          Home
        </a>
        <a
          href='#'
          className='text-brand-600 dark:text-brand-400 hover:underline'
        >
          About
        </a>
        <a
          href='#'
          className='text-brand-600 dark:text-brand-400 hover:underline'
        >
          Projects
        </a>
        <a
          href='#'
          className='text-brand-600 dark:text-brand-400 hover:underline'
        >
          Contact
        </a>
      </>
    ),
  },
};

export const HorizontalListWithIcons: Story = {
  name: 'Horizontal List with Icons',
  args: {
    as: 'ul',
    direction: 'horizontal',
    gap: 'lg',
    align: 'center',
    justify: 'center',
    className: 'list-none',
    children: (
      <>
        <li className='flex flex-col items-center gap-2'>
          <span className='text-2xl'>🚀</span>
          <span>Fast</span>
        </li>
        <li className='flex flex-col items-center gap-2'>
          <span className='text-2xl'>🎨</span>
          <span>Beautiful</span>
        </li>
        <li className='flex flex-col items-center gap-2'>
          <span className='text-2xl'>♿</span>
          <span>Accessible</span>
        </li>
      </>
    ),
  },
};
