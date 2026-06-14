import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Alert } from '@danieljoffe/shared-ui/Alert';
import { InteractiveDemo, Mermaid, MetricsDashboard } from '@/components/kit';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function headingId(props: ComponentPropsWithoutRef<'h1'>): string | undefined {
  if (props.id) return props.id;
  if (typeof props.children === 'string') return slugify(props.children);
  return undefined;
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: props => (
      <Heading variant='mdxH1' id={headingId(props)}>
        {props.children}
      </Heading>
    ),
    h2: props => (
      <Heading variant='mdxH2' id={headingId(props)}>
        {props.children}
      </Heading>
    ),
    h3: props => (
      <Heading variant='mdxH3' id={headingId(props)}>
        {props.children}
      </Heading>
    ),
    h4: props => (
      <Heading variant='mdxH4' id={headingId(props)}>
        {props.children}
      </Heading>
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
    // Inline code only — rehype-pretty-code handles code blocks via
    // [data-rehype-pretty-code-figure] styles in theme.css
    code: ({ children, ...props }) => {
      // rehype-pretty-code adds data-theme; skip custom styling for those
      if ('data-theme' in props) return <code {...props}>{children}</code>;
      return (
        <code
          className='px-1.5 py-0.5 rounded bg-surface-tertiary text-text-primary text-xs font-mono'
          {...props}
        >
          {children}
        </code>
      );
    },
    // rehype-pretty-code wraps code blocks in <figure data-rehype-pretty-code-figure>
    // so bare <pre> only appears for non-highlighted blocks
    pre: props => (
      <pre
        className='p-4 bg-surface-secondary rounded-lg border border-border overflow-x-auto text-sm leading-relaxed mb-4 [&>code]:p-0 [&>code]:bg-transparent [&>code]:text-sm [&>code]:rounded-none'
        {...props}
      />
    ),
    hr: () => <hr className='border-border my-8' />,
    table: props => (
      <div
        className='overflow-x-auto mb-4'
        tabIndex={0}
        role='region'
        aria-label='Scrollable table'
      >
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
      <picture>
        <img
          className='rounded-lg border border-border my-4'
          alt={props.alt}
          {...props}
        />
      </picture>
    ),
    Alert,
    InteractiveDemo,
    Mermaid,
    MetricsDashboard,
    ...components,
  };
}
