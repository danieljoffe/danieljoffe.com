import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Nav from './index';
import GlobalProvider from '@/state/Global/Provider';
import Modal from '../Modal';

const meta = {
  component: Nav,
  title: 'Components/Nav',
  tags: ['autodocs'],
  decorators: [
    Story => (
      <GlobalProvider>
        <Modal />
        <Story />
      </GlobalProvider>
    ),
  ],
} satisfies Meta<typeof Nav>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Index: Story = {};
