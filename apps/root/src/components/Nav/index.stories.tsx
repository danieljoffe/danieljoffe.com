import type { Args, Meta, StoryObj } from '@storybook/nextjs-vite';

import Nav from './index';
import GlobalProvider from '@/state/Global/Provider';
import Modal from '../Modal';

const meta: Meta<typeof Nav> = {
  component: Nav,
  title: 'Components/Nav',
  decorators: [
    Story => {
      return (
        <GlobalProvider>
          <Modal />
          <Story />
        </GlobalProvider>
      );
    },
  ],
} satisfies Meta<typeof Nav>;
export default meta;

type Story = StoryObj<typeof Nav> & {
  args: Args;
};

export const Index: Story = {
  args: {},
} satisfies Story;
