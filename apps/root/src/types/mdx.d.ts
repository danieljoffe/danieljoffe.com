declare module '*.mdx' {
  import type { ComponentProps, ComponentType } from 'react';

  export interface MDXMetadata {
    title: string;
    description: string;
    tags: string[];
    author: string;
    created: string;
    updated: string;
  }

  const MDXComponent: ComponentType<ComponentProps<'div'>>;
  export default MDXComponent;
}

declare module 'mdx/types' {
  // eslint-disable-next-line no-duplicate-imports -- separate module declaration scope
  import type { ComponentType } from 'react';

  export interface MDXComponents {
    [key: string]: ComponentType<Record<string, unknown>>;
  }
}
