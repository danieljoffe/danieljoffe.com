'use client';

import type { ComponentType } from 'react';
import { useEffect, useRef } from 'react';
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { cn } from '@/lib/cn';
import { buildEditorExtensions } from './schema';

interface MarkdownPreviewEditorProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string | undefined;
}

// Editable WYSIWYG markdown surface backed by TipTap. The schema is locked
// (see schema.ts) to the exact set of nodes/marks the wyrdfold-api ATS
// linter accepts, so anything the user can create via the editor will pass
// server-side lint on save.
//
// The component is stateless about save status — the parent owns `value`
// and the autosave debounce. `onChange` only fires when the serialized
// markdown actually differs from `value`, so opening a doc and blurring
// without editing does not produce phantom edits in version history.
export default function MarkdownPreviewEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  ariaLabel,
  className,
}: MarkdownPreviewEditorProps) {
  // Track the last value we serialized so we can short-circuit no-op
  // updates from tiptap-markdown's whitespace normalization. Without
  // this, opening a doc → blur (no edits) would still call onChange
  // with normalized markdown and bump the parent into 'pending'.
  const lastSerializedRef = useRef(value);

  const editor = useEditor({
    extensions: buildEditorExtensions(),
    content: value,
    editable: !disabled,
    // TipTap 3 in Next.js App Router / React 19: avoid SSR mismatch by
    // deferring the initial render to the client.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        // Tailwind 4 typography plugin isn't imported in this app (see
        // global.css). JobDetailPanel.tsx solves the same problem with
        // arbitrary variants; mirror that pattern so the editor surface
        // renders with proper heading / list hierarchy.
        class: [
          'min-h-[60vh] w-full bg-surface p-4',
          'leading-relaxed focus:outline-none',
          '[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold',
          '[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold',
          '[&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-medium',
          '[&_p]:my-2',
          '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_li]:my-1',
          '[&_strong]:font-semibold',
          '[&_em]:italic',
          '[&_a]:text-brand-500 [&_a]:underline',
        ].join(' '),
      },
    },
    onUpdate: ({ editor: e }) => {
      const next = (
        e.storage as unknown as { markdown: { getMarkdown(): string } }
      ).markdown.getMarkdown();
      if (next === lastSerializedRef.current) return;
      lastSerializedRef.current = next;
      onChange(next);
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  // External value swaps (e.g. restoreVersion) must propagate into the
  // editor. Guard against feedback loops: only reset content when the
  // incoming value differs from what we last emitted.
  useEffect(() => {
    if (!editor) return;
    if (value === lastSerializedRef.current) return;
    lastSerializedRef.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  // Approval lock / readapt-in-flight toggles disabled at runtime —
  // mirror that into the editor's editable state.
  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable === !disabled) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div
      className={cn(
        'wyrdfold-md-editor overflow-hidden rounded-md border border-border',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      data-sentry-mask
    >
      {!disabled && editor && <MarkdownEditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function MarkdownEditorToolbar({ editor }: { editor: Editor }) {
  // useEditorState re-renders the toolbar whenever the relevant slice of
  // editor state changes (cursor moves into bold, list created, etc.).
  // Without it the buttons would never reflect active state.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            isBold: e.isActive('bold'),
            isItalic: e.isActive('italic'),
            isBullet: e.isActive('bulletList'),
            isOrdered: e.isActive('orderedList'),
            isH1: e.isActive('heading', { level: 1 }),
            isH2: e.isActive('heading', { level: 2 }),
            isH3: e.isActive('heading', { level: 3 }),
            isLink: e.isActive('link'),
          }
        : null,
  });

  if (!state) return null;

  function promptLink() {
    const current =
      (editor.getAttributes('link') as { href?: string }).href ?? '';
    /* eslint-disable no-alert -- personal tool, native prompt is fine */
    const url = window.prompt('URL', current);
    /* eslint-enable no-alert */
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    }
  }

  return (
    <div
      role='toolbar'
      aria-label='Formatting'
      className='flex flex-wrap items-center gap-1 border-b border-border bg-surface-secondary p-1'
    >
      <ToolbarButton
        label='Heading 1'
        Icon={Heading1}
        active={state.isH1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        label='Heading 2'
        Icon={Heading2}
        active={state.isH2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label='Heading 3'
        Icon={Heading3}
        active={state.isH3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <ToolbarSeparator />
      <ToolbarButton
        label='Bold'
        Icon={Bold}
        active={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label='Italic'
        Icon={Italic}
        active={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarSeparator />
      <ToolbarButton
        label='Bullet list'
        Icon={List}
        active={state.isBullet}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label='Numbered list'
        Icon={ListOrdered}
        active={state.isOrdered}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarSeparator />
      <ToolbarButton
        label='Link'
        Icon={Link2}
        active={state.isLink}
        onClick={promptLink}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  active: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, Icon, active, onClick }: ToolbarButtonProps) {
  return (
    <button
      type='button'
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      // mousedown.preventDefault keeps the editor's selection alive when
      // the user clicks the toolbar — otherwise toggleBold would have
      // nothing to act on because the selection collapsed on focus loss.
      onMouseDown={e => e.preventDefault()}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
        active && 'bg-surface-tertiary text-text-primary'
      )}
    >
      <Icon className='h-4 w-4' aria-hidden />
    </button>
  );
}

function ToolbarSeparator() {
  return (
    <span
      role='separator'
      aria-orientation='vertical'
      className='mx-1 h-5 w-px bg-border'
    />
  );
}
