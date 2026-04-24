'use client';

import { useMemo, useState } from 'react';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import type { PostThumbnail } from '@/types/postTypes';
import { PostCard, TagChipStrip } from '@/components/kit';
import type { TagChip } from '@/components/kit';

interface ProjectsGridWithTagsProps {
  allProjects: PostThumbnail[];
  tags: TagChip[];
  viewAllTagsHref?: string | undefined;
}

/**
 * Client island that wraps the projects grid with tag chip filtering.
 * When a tag is selected, the grid is filtered to show only matching
 * projects. Clicking the active tag again clears the filter.
 */
export function ProjectsGridWithTags({
  allProjects,
  tags,
  viewAllTagsHref,
}: ProjectsGridWithTagsProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const isFiltering = activeTag !== null;

  const tagResults = useMemo(() => {
    if (!isFiltering) return [];
    return allProjects.filter(
      project => project.tags && project.tags.includes(activeTag)
    );
  }, [isFiltering, allProjects, activeTag]);

  const handleTagClick = (tagName: string) => {
    setActiveTag(prev => (prev === tagName ? null : tagName));
  };

  const visibleProjects = isFiltering ? tagResults : allProjects;

  return (
    <div className='space-y-6'>
      <TagChipStrip
        tags={tags}
        viewAllHref={viewAllTagsHref}
        ariaLabel='Filter projects by tag'
        onTagClick={handleTagClick}
        activeTag={activeTag}
        className='mb-2'
      />

      {isFiltering && (
        <Text variant='meta' as='p' aria-live='polite'>
          {`${tagResults.length} ${tagResults.length === 1 ? 'case study' : 'case studies'} tagged "${activeTag}"`}
        </Text>
      )}

      {visibleProjects.length === 0 ? (
        <Text variant='body' as='p' className='text-text-secondary'>
          {isFiltering
            ? `No case studies tagged "${activeTag}".`
            : 'No case studies yet.'}
        </Text>
      ) : (
        <div
          data-testid='post-list'
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        >
          {visibleProjects.map((project, i) => (
            <PostCard
              key={project.slug}
              post={project}
              priority={!isFiltering && i < 3}
              analyticsType='project'
            />
          ))}
        </div>
      )}
    </div>
  );
}
