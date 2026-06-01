import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import MarkdownPreviewEditor from './MarkdownPreviewEditor';

// Tip: TipTap is asynchronous on mount via `immediatelyRender: false`.
// We wrap render in `act` and flush microtasks before asserting.
async function renderEditor(props: {
  value?: string;
  onChange?: (next: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  const onChange = props.onChange ?? jest.fn();
  const onBlur = props.onBlur ?? jest.fn();
  const utils = render(
    <MarkdownPreviewEditor
      value={props.value ?? '# Hello\n\nWorld.'}
      onChange={onChange}
      onBlur={onBlur}
      disabled={props.disabled ?? false}
      ariaLabel='Test markdown'
    />
  );
  await act(async () => {
    await Promise.resolve();
  });
  return { ...utils, onChange, onBlur };
}

describe('MarkdownPreviewEditor', () => {
  it('renders the value as rich HTML once mounted', async () => {
    await renderEditor({ value: '# Resume\n\nSenior **engineer**.' });
    const surface = screen.getByLabelText('Test markdown');
    expect(surface).toBeInTheDocument();
    expect(surface.querySelector('h1')?.textContent).toBe('Resume');
    expect(surface.querySelector('strong')?.textContent).toBe('engineer');
  });

  it('exposes the editor surface with the provided aria-label', async () => {
    await renderEditor({ value: '# Test' });
    // The aria-label binds to the contenteditable surface so screen
    // readers announce the editor purpose. Resume/CoverLetter pages
    // pass distinct labels; this guards that the prop reaches TipTap.
    const surface = screen.getByLabelText('Test markdown');
    expect(surface.getAttribute('contenteditable')).toBe('true');
  });

  it('renders as non-editable when disabled', async () => {
    await renderEditor({ value: '# Locked', disabled: true });
    const surface = screen.getByLabelText('Test markdown');
    // TipTap flips `contenteditable=false` on setEditable(false).
    expect(surface.getAttribute('contenteditable')).toBe('false');
  });

  it('updates editable state when the disabled prop flips', async () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <MarkdownPreviewEditor
        value='# Hello'
        onChange={onChange}
        disabled={false}
        ariaLabel='Test markdown'
      />
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.getByLabelText('Test markdown').getAttribute('contenteditable')
    ).toBe('true');

    await act(async () => {
      rerender(
        <MarkdownPreviewEditor
          value='# Hello'
          onChange={onChange}
          disabled={true}
          ariaLabel='Test markdown'
        />
      );
    });
    expect(
      screen.getByLabelText('Test markdown').getAttribute('contenteditable')
    ).toBe('false');
  });

  it('does not fire onChange on initial mount', async () => {
    // Phantom-edit guard: opening a doc must not call onChange before
    // the user has typed. Otherwise the parent flips into 'pending' and
    // an idle autosave writes back normalized markdown as a new version.
    const onChange = jest.fn();
    await renderEditor({ value: '# Hello\n\n- one\n- two', onChange });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders the formatting toolbar when editable', async () => {
    await renderEditor({ value: '# Hi' });
    const toolbar = screen.getByRole('toolbar', { name: /formatting/i });
    expect(toolbar).toBeInTheDocument();
    // Each formatting affordance has an accessible name so SR users
    // can discover the same set the visual toolbar exposes.
    expect(
      screen.getByRole('button', { name: 'Heading 1' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Bullet list' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
  });

  it('hides the toolbar when disabled (approved/locked state)', async () => {
    await renderEditor({ value: '# Locked', disabled: true });
    expect(
      screen.queryByRole('toolbar', { name: /formatting/i })
    ).not.toBeInTheDocument();
  });

  it('reflects bold via aria-pressed when content is bold', async () => {
    await renderEditor({ value: '**hello**' });
    // The editor places its cursor at start by default; for an
    // all-bold document the bold mark is active at the entry point.
    const boldButton = screen.getByRole('button', { name: 'Bold' });
    expect(boldButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('syncs external value changes into the editor (restoreVersion path)', async () => {
    // When the parent calls `setMarkdown(versionMd)` from a version
    // restore, the editor must adopt the new content. Without the
    // useEffect that watches `value`, restoreVersion would silently no-op.
    const onChange = jest.fn();
    const { rerender } = render(
      <MarkdownPreviewEditor
        value='# Old'
        onChange={onChange}
        ariaLabel='Test markdown'
      />
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.getByLabelText('Test markdown').querySelector('h1')?.textContent
    ).toBe('Old');

    await act(async () => {
      rerender(
        <MarkdownPreviewEditor
          value='# Restored'
          onChange={onChange}
          ariaLabel='Test markdown'
        />
      );
      await Promise.resolve();
    });
    expect(
      screen.getByLabelText('Test markdown').querySelector('h1')?.textContent
    ).toBe('Restored');
    // External sync must not feed back through onChange — otherwise
    // restoreVersion would self-trigger an autosave loop.
    expect(onChange).not.toHaveBeenCalled();
  });
});
