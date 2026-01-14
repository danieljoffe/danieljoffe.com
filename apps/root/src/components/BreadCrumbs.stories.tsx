import type { Meta, StoryObj } from '@storybook/react';
import BreadCrumbs from './BreadCrumbs';

const meta = {
  component: BreadCrumbs,
  title: 'Components/BreadCrumbs',
  decorators: [
    Story => {
      return (
        <div className='flex p-4'>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof BreadCrumbs>;
export default meta;

type Story = StoryObj<typeof BreadCrumbs>;

export const Default = {
  args: {
    items: [
      { href: '/', label: 'Home' },
      { href: '/projects', label: 'Projects' },
      { href: '/projects/ui-components', label: 'UI Components' },
    ],
  },
} satisfies Story;

export const Short = {
  args: {
    items: [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'About' },
    ],
  },
} satisfies Story;
