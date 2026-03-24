declare module '*.mdx' {
  import type { ComponentProps, ComponentType } from 'react';
  import type { PostMetadata } from '@/types/postTypes';

  export const metadata: PostMetadata;

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
