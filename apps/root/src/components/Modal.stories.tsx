import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';

import Button from '@/components/Button';
import { ThemeProvider } from '@/state/Theme/ThemeProvider';
import ModalProvider, { useModal } from '@/state/Modal/Provider';
import Modal from './Modal';

const meta = {
  component: Modal,
  title: 'Components/Modal',
  tags: ['autodocs'],
  decorators: [
    Story => {
      const ButtonTrigger = () => {
        const { isModalOpen, setModalContent } = useModal();
        return (
          <Button onClick={() => setModalContent(<div>Modal Content</div>)}>
            {isModalOpen ? 'Hide Modal' : 'Show Modal'}
          </Button>
        );
      };

      return (
        <ThemeProvider>
          <ModalProvider>
            <Modal />
            <ButtonTrigger />
            <Story />
          </ModalProvider>
        </ThemeProvider>
      );
    },
  ],
} satisfies Meta<typeof Modal>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await userEvent.click(canvas.getByRole('button'));

    const [modalContent] =
      (await canvasElement.parentElement?.getElementsByTagName('main')) || [];

    await expect(modalContent).toBeInTheDocument();
    await expect(modalContent.textContent).toBe('Modal Content');
  },
};
