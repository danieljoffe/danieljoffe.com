import type { Meta, StoryObj } from '@storybook/react-vite';
import { GridBg } from './GridBg';

const meta = {
  title: 'Decorative/GridBg',
  component: GridBg,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className='relative w-full h-[400px] bg-surface rounded-lg overflow-hidden'>
        <Story />
        <div className='relative z-10 flex items-center justify-center h-full'>
          <span className='text-text-primary text-sm font-medium'>
            Content overlaid on grid background
          </span>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof GridBg>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
