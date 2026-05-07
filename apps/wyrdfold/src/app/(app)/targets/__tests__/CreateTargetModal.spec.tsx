import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateTargetModal from '../CreateTargetModal';

describe('CreateTargetModal', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <CreateTargetModal
        isOpen={false}
        onClose={() => undefined}
        onSubmitManual={() => undefined}
        onSubmitUrl={() => undefined}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog with both Manual and From URL tabs when open', () => {
    render(
      <CreateTargetModal
        isOpen
        onClose={() => undefined}
        onSubmitManual={() => undefined}
        onSubmitUrl={() => undefined}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /manual/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /from url/i })).toBeInTheDocument();
  });

  it('disables the Create Target button until a label is entered (manual mode)', async () => {
    const user = userEvent.setup();
    render(
      <CreateTargetModal
        isOpen
        onClose={() => undefined}
        onSubmitManual={() => undefined}
        onSubmitUrl={() => undefined}
      />
    );

    const submit = screen.getByRole('button', { name: /create target/i });
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByRole('textbox', { name: /title/i }),
      'Frontend Engineer'
    );
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it('submits a manual target with trimmed label and optional description', async () => {
    const onSubmitManual = jest.fn();
    const user = userEvent.setup();
    render(
      <CreateTargetModal
        isOpen
        onClose={() => undefined}
        onSubmitManual={onSubmitManual}
        onSubmitUrl={() => undefined}
      />
    );

    await user.type(
      screen.getByRole('textbox', { name: /title/i }),
      '  Frontend Engineer  '
    );
    await user.click(screen.getByRole('button', { name: /create target/i }));

    expect(onSubmitManual).toHaveBeenCalledWith({
      label: 'Frontend Engineer',
      description: undefined,
    });
  });

  it('switches to URL mode and submits with jd_url', async () => {
    const onSubmitUrl = jest.fn();
    const user = userEvent.setup();
    render(
      <CreateTargetModal
        isOpen
        onClose={() => undefined}
        onSubmitManual={() => undefined}
        onSubmitUrl={onSubmitUrl}
      />
    );

    await user.click(screen.getByRole('tab', { name: /from url/i }));
    await user.type(
      screen.getByRole('textbox', { name: /job description url/i }),
      'https://example.com/jd'
    );
    await user.click(screen.getByRole('button', { name: /create target/i }));

    expect(onSubmitUrl).toHaveBeenCalledWith({
      jd_url: 'https://example.com/jd',
      label: undefined,
    });
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <CreateTargetModal
        isOpen
        onClose={onClose}
        onSubmitManual={() => undefined}
        onSubmitUrl={() => undefined}
      />
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes the dialog when Escape is pressed', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(
      <CreateTargetModal
        isOpen
        onClose={onClose}
        onSubmitManual={() => undefined}
        onSubmitUrl={() => undefined}
      />
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
