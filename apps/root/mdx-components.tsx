import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: props => (
      <h1
        className='text-2xl font-bold text-text-primary tracking-tight mb-6'
        {...props}
      />
    ),
    h2: props => (
      <h2
        className='text-lg font-semibold text-text-primary mt-12 mb-4 scroll-mt-20'
        {...props}
      />
    ),
    h3: props => (
      <h3
        className='text-sm font-semibold text-text-primary mt-8 mb-3'
        {...props}
      />
    ),
    h4: props => (
      <h4
        className='text-sm font-semibold text-text-primary mt-6 mb-2'
        {...props}
      />
    ),
    p: props => (
      <p
        className='text-sm text-text-secondary leading-relaxed mb-4'
        {...props}
      />
    ),
    a: props => (
      <a
        className='text-brand-500 hover:text-brand-600 underline underline-offset-2 transition-colors'
        {...props}
      />
    ),
    strong: props => (
      <strong className='font-semibold text-text-primary' {...props} />
    ),
    em: props => <em className='text-text-secondary italic' {...props} />,
    ul: props => (
      <ul
        className='list-disc list-outside pl-5 space-y-2 mb-4 text-sm text-text-secondary leading-relaxed'
        {...props}
      />
    ),
    ol: props => (
      <ol
        className='list-decimal list-outside pl-5 space-y-2 mb-4 text-sm text-text-secondary leading-relaxed'
        {...props}
      />
    ),
    li: props => <li className='pl-1' {...props} />,
    blockquote: props => (
      <blockquote
        className='border-l-2 border-brand-200 pl-4 py-1 my-4 text-sm text-text-tertiary italic'
        {...props}
      />
    ),
    code: props => (
      <code
        className='px-1.5 py-0.5 rounded bg-surface-tertiary text-text-primary text-xs font-mono'
        {...props}
      />
    ),
    pre: props => (
      <pre
        className='p-4 bg-surface-secondary rounded-lg border border-border overflow-x-auto text-sm leading-relaxed mb-4 [&>code]:p-0 [&>code]:bg-transparent [&>code]:text-sm [&>code]:rounded-none'
        {...props}
      />
    ),
    hr: () => <hr className='border-border my-8' />,
    table: props => (
      <div className='overflow-x-auto mb-4'>
        <table
          className='w-full text-sm text-text-secondary border-collapse'
          {...props}
        />
      </div>
    ),
    th: props => (
      <th
        className='text-left text-xs font-semibold text-text-primary uppercase tracking-wider px-3 py-2 border-b border-border bg-surface-secondary'
        {...props}
      />
    ),
    td: props => <td className='px-3 py-2 border-b border-border' {...props} />,
    img: props => (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      <img className='rounded-lg border border-border my-4' {...props} />
    ),
    ...components,
  };
}
