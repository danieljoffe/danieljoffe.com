import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from './Section';

const meta: Meta<typeof Section> = {
  title: 'Layout/Section',
  component: Section,
  tags: ['autodocs'],
  argTypes: {
    padding: {
      description: 'Vertical padding of the section',
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      table: {
        defaultValue: { summary: 'none' },
      },
    },
    background: {
      description: 'Background color variant',
      control: 'select',
      options: ['none', 'default', 'alt', 'elevated'],
      table: {
        defaultValue: { summary: 'none' },
      },
    },
    center: {
      description: 'Center children horizontally using flexbox',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    overflow: {
      description: 'Control overflow behavior',
      control: 'select',
      options: ['visible', 'hidden', 'auto'],
      table: {
        defaultValue: { summary: 'hidden' },
      },
    },
    fullWidth: {
      description: 'Full width section',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Section>;

export const Default: Story = {
  args: {
    children: (
      <div className='text-center'>
        <h2 className='text-2xl font-bold mb-4'>Section Title</h2>
        <p className='text-foreground-muted'>
          This is a section with default settings (centered, full width, hidden
          overflow).
        </p>
      </div>
    ),
  },
};

export const SmallPadding: Story = {
  args: {
    padding: 'sm',
    children: (
      <div className='text-center'>
        <h2 className='text-2xl font-bold mb-4'>Small Padding Section</h2>
        <p className='text-foreground-muted'>This section has small padding.</p>
      </div>
    ),
  },
};

export const LargePadding: Story = {
  args: {
    padding: 'lg',
    children: (
      <div className='text-center'>
        <h2 className='text-2xl font-bold mb-4'>Large Padding Section</h2>
        <p className='text-foreground-muted'>This section has large padding.</p>
      </div>
    ),
  },
};

export const AltBackground: Story = {
  args: {
    background: 'alt',
    children: (
      <div className='text-center'>
        <h2 className='text-2xl font-bold mb-4'>Alt Background</h2>
        <p className='text-foreground-muted'>
          This section uses the alt background.
        </p>
      </div>
    ),
  },
};

export const ElevatedBackground: Story = {
  args: {
    background: 'elevated',
    children: (
      <div className='text-center'>
        <h2 className='text-2xl font-bold mb-4'>Elevated Background</h2>
        <p className='text-foreground-muted'>
          This section uses the elevated background.
        </p>
      </div>
    ),
  },
};

export const NoPadding: Story = {
  args: {
    padding: 'none',
    background: 'elevated',
    children: (
      <div className='text-center p-4'>
        <h2 className='text-2xl font-bold mb-4'>No Section Padding</h2>
        <p className='text-foreground-muted'>
          This section has no padding (content adds its own).
        </p>
      </div>
    ),
  },
};
