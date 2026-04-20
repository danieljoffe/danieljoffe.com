import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  code: string;
  language: string;
  label: string | undefined;
}

export default async function CodeBlock({
  code,
  language,
  label,
}: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang: language === 'text' ? 'bash' : language,
    themes: {
      dark: 'github-dark-dimmed',
      light: 'github-light',
    },
  });

  return (
    <div>
      {label && (
        <p className='text-xs font-medium text-muted mb-2 uppercase tracking-wide'>
          {label}
        </p>
      )}
      <div
        role='region'
        aria-label={
          label ? `Code example: ${label.toLowerCase()}` : 'Code example'
        }
        className='rounded-lg border border-border overflow-x-auto text-sm [&_pre]:p-4 [&_pre]:m-0 [&_pre]:bg-surface-secondary!'
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
