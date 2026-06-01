import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

// Single source of truth: every node/mark TipTap can produce must also be
// accepted by `apps/wyrdfold-api/app/services/ats_lint/markdown_linter.py`.
// Diverging here means a user can type something the editor accepts but the
// server rejects with a 422.
//
// Disabled (linter-hostile or out of scope for resumes):
//   - codeBlock      → renders as code fence; ATS parsers strip
//   - blockquote     → uncommon in resumes; serializer adds `>` prefixes
//   - horizontalRule → renders as `---`; ATS treats as text
//   - strike         → markdown-it serializes as `~~…~~`; not in linter vocab
//   - code (inline)  → backticks survive into docx as literal text
export function buildEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      strike: false,
      code: false,
      // StarterKit ships Link in v3; we disable it to plug in our own
      // configured copy below (no autolink, no openOnClick, safe rel).
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Markdown.configure({
      html: false,
      breaks: false,
      linkify: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ];
}
