import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BreadCrumbs from './BreadCrumbs';

const meta = {
  component: BreadCrumbs,
  title: 'Components/BreadCrumbs',
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/projects/ui-components',
      },
    },
  },
  argTypes: {
    items: {
      description: 'Array of breadcrumb navigation links',
    },
  },
  decorators: [
    Story => (
      <div className='flex p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BreadCrumbs>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { href: '/', label: 'Home' },
      { href: '/projects', label: 'Projects' },
      { href: '/projects/ui-components', label: 'UI Components' },
    ],
  },
};

export const Short: Story = {
  args: {
    items: [
      { href: '/projects', label: 'Projects' },
      { href: '/projects/ui-components', label: 'UI Components' },
    ],
  },
};
