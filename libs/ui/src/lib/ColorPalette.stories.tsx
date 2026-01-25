import type { Meta, StoryObj } from '@storybook/react-vite';
import { ColorPalette } from './ColorPalette';

const meta = {
  component: ColorPalette,
  title: 'ColorPalette',
} satisfies Meta<typeof ColorPalette>;
export default meta;

type Story = StoryObj<typeof ColorPalette>;

export const Default: Story = {
  args: {},
};
