import { ComponentType } from 'react';
import {
  projectMdxComponents as components,
  projectMdxMetadata as metadata,
} from '@/data/generated/projects.generated';
import { AllowedProjectSlugs } from '@/types/base';
import { PostMetadata } from '@/types/postTypes';

// The component/metadata maps are generated from data/content/projects/*.mdx by
// scripts/generate-content-registry.ts (gitignored output). Re-typing them to a
// Record over AllowedProjectSlugs makes a missing/extra slug a compile error.
export const projectMdxComponents: Record<AllowedProjectSlugs, ComponentType> =
  components;
export const projectMdxMetadata: Record<AllowedProjectSlugs, PostMetadata> =
  metadata;
