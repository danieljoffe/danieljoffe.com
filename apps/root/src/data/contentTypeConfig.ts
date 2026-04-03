import { ContentType, ContentTypeConfig } from '@/types/postTypes';

export const contentTypeConfigs: Record<ContentType, ContentTypeConfig> = {
  project: {
    type: 'project',
    basePath: '/projects',
    label: 'Project',
    contentDir: 'projects',
  },
  experience: {
    type: 'experience',
    basePath: '/experience',
    label: 'Experience',
    contentDir: 'experience',
  },
  blog: {
    type: 'blog',
    basePath: '/blog',
    label: 'Blog',
    contentDir: 'blog',
  },
};
