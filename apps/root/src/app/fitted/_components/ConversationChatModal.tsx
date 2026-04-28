'use client';

import { Modal } from '@danieljoffe.com/shared-ui/Modal';
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
      title='Improve your profile'
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
