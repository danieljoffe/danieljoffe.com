'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
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
          'min-h-[60vh] w-full rounded-md border border-border bg-surface p-4',
          'leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500',
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
        'wyrdfold-md-editor',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      data-sentry-mask
    >
      <EditorContent editor={editor} />
    </div>
  );
}
