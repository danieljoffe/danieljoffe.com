import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Nav from './index';
import { ThemeProvider } from '@/state/Theme/ThemeProvider';
import ModalProvider from '@/state/Modal/Provider';
import Modal from '../Modal';

const meta = {
  component: Nav,
  title: 'Components/Nav',
  tags: ['autodocs'],
  decorators: [
    Story => (
      <ThemeProvider>
        <ModalProvider>
          <Modal />
          <Story />
        </ModalProvider>
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Nav>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Index: Story = {};
