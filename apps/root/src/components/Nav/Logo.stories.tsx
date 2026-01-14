import type { Meta, StoryObj } from '@storybook/react';
import Logo from './Logo';

const meta = {
  component: Logo,
  title: 'Nav/Logo',
  decorators: [
    Story => {
      return (
        <div className='w-max-[16rem] h-max-[4rem] p-4'>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof Logo>;
export default meta;

type Story = StoryObj<typeof Logo>;

export const Primary = {
  args: {},
} satisfies Story;
