import type { Meta, StoryObj } from '@storybook/react';
import Modal from './Modal';
import { expect } from 'storybook/internal/test';

import Button from '@/components/Button';
import GlobalProvider from '@/state/Global/Provider';
import { useGlobal } from '@/state/Global/Context';

const meta: Meta<typeof Modal> = {
  component: Modal,
  title: 'Components/Modal',
  decorators: [
    Story => {
      const ButtonTrigger = () => {
        const { isModalOpen, setModalContent } = useGlobal();
        return (
          <Button onClick={() => setModalContent(<div>Modal Content</div>)}>
            {isModalOpen ? 'Hide Modal' : 'Show Modal'}
          </Button>
        );
      };

      return (
        <GlobalProvider>
          <Modal />
          <ButtonTrigger />
          <Story />
        </GlobalProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof Modal>;

export const Primary: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await userEvent.click(canvas.getByRole('button'));

    const [modalContent] =
      (await canvasElement.parentElement?.getElementsByTagName('main')) || [];

    expect(modalContent).toBeInTheDocument();
    expect(modalContent.textContent).toBe('Modal Content');
  },
  args: {},
};
