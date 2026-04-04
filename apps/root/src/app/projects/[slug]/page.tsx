import { redirect } from 'next/navigation';
import { SlugPageProps } from '@/types/base';
import { PROJECTS_LINK } from '@/utils/constants';
import { getContentBySlug, getContentSlugs } from '@/data/contentRegistry';
import { buildPostMetadata } from '@/lib/buildPostMetadata';
import { getPostDetailProps } from '@/lib/getPostDetailProps';
import PostDetailLayout from '@/components/PostDetailLayout';

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params;
  const entry = getContentBySlug('project', slug);

  if (!entry) {
    return {
      title: 'Project Not Found',
      description: 'The requested project page could not be found.',
    };
  }

  return buildPostMetadata(entry.metadata);
}

export default async function SlugProjectPage({ params }: SlugPageProps) {
  const { slug } = (await params) ?? {};

  const props = getPostDetailProps('project', slug);
  if (!props) return redirect(PROJECTS_LINK.href);

  return <PostDetailLayout {...props} />;
}

export function generateStaticParams() {
  return getContentSlugs('project').map(slug => ({ slug }));
}

export const dynamicParams = false;
