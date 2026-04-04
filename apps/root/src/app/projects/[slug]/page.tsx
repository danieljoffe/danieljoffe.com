import { redirect } from 'next/navigation';
import { AllowedProjectSlugs, SlugPageProps } from '@/types/base';
import { PROJECTS_LINK } from '@/utils/constants';
import { projectMdxMetadata } from '@/data/content/projects';
import { projectPageSlugs } from '@/data/project';
import { buildPostMetadata } from '@/lib/buildPostMetadata';
import { getPostDetailProps } from '@/lib/getPostDetailProps';
import PostDetailLayout from '@/components/PostDetailLayout';

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params;
  const meta = projectMdxMetadata[slug as AllowedProjectSlugs];

  if (!meta) {
    return {
      title: 'Project Not Found',
      description: 'The requested project page could not be found.',
    };
  }

  return buildPostMetadata(meta);
}

export default async function SlugProjectPage({ params }: SlugPageProps) {
  const { slug } = (await params) ?? {};

  const props = getPostDetailProps('project', slug);
  if (!props) return redirect(PROJECTS_LINK.href);

  return <PostDetailLayout {...props} />;
}

export function generateStaticParams() {
  return projectPageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
