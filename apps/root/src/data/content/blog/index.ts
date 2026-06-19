import { ComponentType } from 'react';
import {
  blogMdxComponents as components,
  blogMdxMetadata as metadata,
} from '@/data/generated/blog.generated';
import { AllowedBlogSlugs } from '@/types/base';
import { PostMetadata } from '@/types/postTypes';

// The component/metadata maps are generated from data/content/blog/*.mdx by
// scripts/generate-content-registry.ts (gitignored output). Re-typing them to a
// Record over AllowedBlogSlugs makes a missing/extra slug a compile error.
export const blogMdxComponents: Record<AllowedBlogSlugs, ComponentType> =
  components;
export const blogMdxMetadata: Record<AllowedBlogSlugs, PostMetadata> = metadata;
