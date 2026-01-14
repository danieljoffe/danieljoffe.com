import type { Meta, StoryObj } from '@storybook/react';
import Loading from './Loading';

const meta = {
  component: Loading,
  title: 'Loading',
  decorators: [
    Story => {
      return (
        <div className='flex items-center justify-center w-full h-full'>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof Loading>;
export default meta;

type Story = StoryObj<typeof Loading>;

export const Primary = {
  args: {},
} satisfies Story;
