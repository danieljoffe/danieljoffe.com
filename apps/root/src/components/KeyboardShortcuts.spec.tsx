import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KeyboardShortcuts from './KeyboardShortcuts';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('KeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing to the DOM', () => {
    const { container } = render(<KeyboardShortcuts />);
    expect(container.firstChild).toBeNull();
  });

  it('navigates to the home link when the "h" key is pressed', async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcuts />);

    await user.keyboard('h');

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\//));
  });

  it('does not navigate when a modifier key is held', async () => {
    const user = userEvent.setup();
    render(<KeyboardShortcuts />);

    await user.keyboard('{Meta>}h{/Meta}');

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('ignores the shortcut when focus is inside an input', async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label='search' />
        <KeyboardShortcuts />
      </>
    );

    const input = document.querySelector('input') as HTMLInputElement;
    input.focus();
    await user.keyboard('h');

    expect(mockPush).not.toHaveBeenCalled();
  });
});
