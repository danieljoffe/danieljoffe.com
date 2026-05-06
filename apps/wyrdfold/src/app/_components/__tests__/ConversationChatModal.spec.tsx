import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversationChatModal from '../ConversationChatModal';

// ConversationChat itself is exercised in its own spec; stub here so the
// modal spec only verifies modal open/close + onComplete wiring.
let _lastChatProps: { onComplete: () => void; onSkip: () => void } | null =
  null;
jest.mock('../ConversationChat', () => ({
  __esModule: true,
  default: (props: { onComplete: () => void; onSkip: () => void }) => {
    _lastChatProps = props;
    return (
      <div data-testid='conversation-chat-stub'>
        <button type='button' onClick={() => props.onComplete()}>
          stub-complete
        </button>
        <button type='button' onClick={() => props.onSkip()}>
          stub-skip
        </button>
      </div>
    );
  },
}));

beforeEach(() => {
  _lastChatProps = null;
});

describe('ConversationChatModal', () => {
  it('renders nothing when isOpen is false', () => {
    render(<ConversationChatModal isOpen={false} onClose={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('conversation-chat-stub')
    ).not.toBeInTheDocument();
  });

  it('renders the modal with ConversationChat when open', () => {
    render(<ConversationChatModal isOpen onClose={() => undefined} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-chat-stub')).toBeInTheDocument();
  });

  it('calls onComplete then onClose when ConversationChat reports completion', async () => {
    const onClose = jest.fn();
    const onComplete = jest.fn();
    const user = userEvent.setup();
    render(
      <ConversationChatModal isOpen onClose={onClose} onComplete={onComplete} />
    );

    await user.click(screen.getByRole('button', { name: /stub-complete/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose (only) when ConversationChat reports skip', async () => {
    const onClose = jest.fn();
    const onComplete = jest.fn();
    const user = userEvent.setup();
    render(
      <ConversationChatModal isOpen onClose={onClose} onComplete={onComplete} />
    );

    await user.click(screen.getByRole('button', { name: /stub-skip/i }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape is pressed', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<ConversationChatModal isOpen onClose={onClose} />);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
