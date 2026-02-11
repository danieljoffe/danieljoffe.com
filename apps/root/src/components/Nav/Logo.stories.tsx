import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Logo from './Logo';

const meta = {
  component: Logo,
  title: 'Components/Nav/Logo',
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className='w-max-[16rem] h-max-[4rem] p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Logo>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
