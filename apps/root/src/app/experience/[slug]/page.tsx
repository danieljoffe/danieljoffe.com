import { redirect } from 'next/navigation';
import { SlugPageProps } from '@/types/base';
import { EXPERIENCE_LINK } from '@/utils/constants';
import { getContentBySlug, getContentSlugs } from '@/data/contentRegistry';
import { buildPostMetadata } from '@/lib/buildPostMetadata';
import { getPostDetailProps } from '@/lib/getPostDetailProps';
import PostDetailLayout from '@/components/PostDetailLayout';

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params;
  const entry = getContentBySlug('experience', slug);

  if (!entry) {
    return {
      title: 'Work Experience Not Found',
      description: 'The requested work experience could not be found.',
    };
  }

  return buildPostMetadata(entry.metadata);
}

export default async function SlugExperiencePage({ params }: SlugPageProps) {
  const { slug } = (await params) ?? {};

  const props = getPostDetailProps('experience', slug);
  if (!props) return redirect(EXPERIENCE_LINK.href);

  return <PostDetailLayout {...props} />;
}

export function generateStaticParams() {
  return getContentSlugs('experience').map(slug => ({ slug }));
}

export const dynamicParams = false;
