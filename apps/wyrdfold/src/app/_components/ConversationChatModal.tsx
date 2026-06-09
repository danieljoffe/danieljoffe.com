'use client';

import { Modal } from '@danieljoffe/shared-ui/Modal';
import ConversationChat from './ConversationChat';

interface ConversationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function ConversationChatModal({
  isOpen,
  onClose,
  onComplete,
}: ConversationChatModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='lg'
      title='Fill in profile details'
    >
      <ConversationChat
        onComplete={() => {
          onComplete?.();
          onClose();
        }}
        onSkip={onClose}
      />
    </Modal>
  );
}
