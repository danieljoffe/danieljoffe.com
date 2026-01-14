import type { Meta, StoryObj } from '@storybook/react';

import BreadCrumbs from './BreadCrumbs';

const meta = {
  component: BreadCrumbs,
  title: 'Components/BreadCrumbs',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/projects/ui-components',
      },
    },
  },
  decorators: [
    Story => {
      return (
        // <Memoryrouter></>
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
      { href: '/projects', label: 'Projects' },
      { href: '/projects/ui-components', label: 'UI Components' },
    ],
  },
} satisfies Story;
