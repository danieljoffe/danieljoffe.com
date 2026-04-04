import { redirect } from 'next/navigation';
import { SlugPageProps } from '@/types/base';
import { BLOG_LINK } from '@/utils/constants';
import { getContentBySlug, getContentSlugs } from '@/data/contentRegistry';
import { buildPostMetadata } from '@/lib/buildPostMetadata';
import { getPostDetailProps } from '@/lib/getPostDetailProps';
import PostDetailLayout from '@/components/PostDetailLayout';

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params;
  const entry = getContentBySlug('blog', slug);

  if (!entry) {
    return {
      title: 'Blog Post Not Found',
      description: 'The requested blog post could not be found.',
    };
  }

  return buildPostMetadata(entry.metadata);
}

export default async function SlugBlogPage({ params }: SlugPageProps) {
  const { slug } = (await params) ?? {};

  const props = getPostDetailProps('blog', slug);
  if (!props) return redirect(BLOG_LINK.href);

  return <PostDetailLayout {...props} />;
}

export function generateStaticParams() {
  return getContentSlugs('blog').map(slug => ({ slug }));
}

export const dynamicParams = false;
