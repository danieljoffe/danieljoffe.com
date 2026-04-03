declare module '*.mdx' {
  import type { ComponentProps, ComponentType } from 'react';
  import type { PostMetadata } from '@/types/postTypes';

  export const metadata: PostMetadata;

  const MDXComponent: ComponentType<ComponentProps<'div'>>;
  export default MDXComponent;
}

declare module 'mdx/types' {
  export interface MDXComponents {
    [key: string]: ComponentType<Record<string, unknown>>;
  }
}
