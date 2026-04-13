import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './Kbd';

const meta = {
  title: 'Data Display/Kbd',
  component: Kbd,
  tags: ['autodocs'],
} satisfies Meta<typeof Kbd>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'K' },
};

export const Modifier: Story = {
  args: { children: '⌘' },
};

export const Escape: Story = {
  args: { children: 'Esc' },
};

export const KeyCombo: Story = {
  args: { children: '⌘' },
  render: () => (
    <div className='flex items-center gap-1'>
      <Kbd>⌘</Kbd>
      <span className='text-text-tertiary text-xs'>+</span>
      <Kbd>K</Kbd>
    </div>
  ),
};
