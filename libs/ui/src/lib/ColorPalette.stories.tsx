import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPalette } from './ColorPalette';

const meta: Meta<typeof ColorPalette> = {
  title: 'Design/ColorPalette',
  component: ColorPalette,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ColorPalette>;

export const Default: Story = {
  args: {},
};
