import type { Meta, StoryObj } from '@storybook/react-vite';
import { Loading } from './Loading';

const meta: Meta<typeof Loading> = {
  title: 'Components/Loading',
  component: Loading,
  tags: ['autodocs'],
  argTypes: {
    'aria-label': {
      description: 'Accessible label for the loading state',
      control: 'text',
      table: {
        defaultValue: { summary: 'Loading content' },
      },
    },
    className: {
      description: 'Custom className for the container',
      control: 'text',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A fancy loading component with dual-ring spinner and bouncing dots animation. Includes full ARIA support for accessibility.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Loading>;

export const Default: Story = {
  args: {},
};

export const CustomLabel: Story = {
  args: {
    'aria-label': 'Fetching data from server',
  },
};

export const WithCustomClass: Story = {
  args: {
    className: 'bg-neutral-100 rounded-lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading component with a custom background and border radius.',
      },
    },
  },
};

export const InContainer: Story = {
  decorators: [
    Story => (
      <div className='border border-border rounded-lg p-4'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Loading component displayed inside a container element.',
      },
    },
  },
};
