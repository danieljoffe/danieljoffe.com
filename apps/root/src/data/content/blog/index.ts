import { AllowedBlogSlugs } from '@/types/base';
import { PostMetadata } from '@/types/postTypes';
import { ComponentType } from 'react';

import UnifiedContentPipeline, {
  metadata as unifiedPipelineMeta,
} from './unified-content-pipeline.mdx';

export const blogMdxComponents: Record<AllowedBlogSlugs, ComponentType> = {
  'unified-content-pipeline': UnifiedContentPipeline,
};

export const blogMdxMetadata: Record<AllowedBlogSlugs, PostMetadata> = {
  'unified-content-pipeline': unifiedPipelineMeta,
};
