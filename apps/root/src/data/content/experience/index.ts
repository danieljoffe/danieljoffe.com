import { ComponentType } from 'react';
import {
  experienceMdxComponents as components,
  experienceMdxMetadata as metadata,
} from '@/data/generated/experience.generated';
import { AllowedExperienceSlugs } from '@/types/base';
import { PostMetadata } from '@/types/postTypes';

// The component/metadata maps are generated from data/content/experience/*.mdx by
// scripts/generate-content-registry.ts (gitignored output). Re-typing them to a
// Record over AllowedExperienceSlugs makes a missing/extra slug a compile error.
export const experienceMdxComponents: Record<
  AllowedExperienceSlugs,
  ComponentType
> = components;
export const experienceMdxMetadata: Record<
  AllowedExperienceSlugs,
  PostMetadata
> = metadata;
