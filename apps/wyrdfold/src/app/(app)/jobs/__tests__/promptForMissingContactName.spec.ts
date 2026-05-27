import { promptForMissingContactName } from '../promptForMissingContactName';

describe('promptForMissingContactName', () => {
  const originalPrompt = window.prompt;
  const originalFetch = global.fetch;

  afterEach(() => {
    window.prompt = originalPrompt;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns false without prompting when detail is undefined', async () => {
    const promptSpy = jest.fn();
    window.prompt = promptSpy;

    const result = await promptForMissingContactName(undefined);

    expect(result).toBe(false);
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it('returns false without prompting when detail does not match the gate', async () => {
    const promptSpy = jest.fn();
    window.prompt = promptSpy;

    const result = await promptForMissingContactName(
      'Master doc has gaps — update it first'
    );

    expect(result).toBe(false);
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it('returns false when the user cancels the prompt', async () => {
    window.prompt = jest.fn(() => null);
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await promptForMissingContactName(
      'No contact name on file. Set your name in Settings → Profile…'
    );

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns false when the user submits an empty / whitespace name', async () => {
    window.prompt = jest.fn(() => '   ');
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await promptForMissingContactName(
      'No contact name on file. Set your name in Settings → Profile…'
    );

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('PATCHes /api/profile/identity and returns true when PATCH succeeds', async () => {
    window.prompt = jest.fn(() => '  Daniel Joffe  ');
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await promptForMissingContactName(
      'No contact name on file. Set your name in Settings → Profile…'
    );

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith('/api/profile/identity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Daniel Joffe' }),
    });
  });

  it('returns false when the PATCH fails', async () => {
    window.prompt = jest.fn(() => 'Daniel Joffe');
    const fetchSpy = jest.fn().mockResolvedValue({ ok: false });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await promptForMissingContactName(
      'No contact name on file. Set your name in Settings → Profile…'
    );

    expect(result).toBe(false);
  });
});
