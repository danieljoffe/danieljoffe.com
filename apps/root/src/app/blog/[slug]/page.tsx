import { redirect } from 'next/navigation';
import { AllowedBlogSlugs, SlugPageProps } from '@/types/base';
import { BLOG_LINK } from '@/utils/constants';
import { blogMdxMetadata } from '@/data/content/blog';
import { blogPageSlugs } from '@/data/blog';
import { buildPostMetadata } from '@/lib/buildPostMetadata';
import { getPostDetailProps } from '@/lib/getPostDetailProps';
import PostDetailLayout from '@/components/PostDetailLayout';

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params;
  const meta = blogMdxMetadata[slug as AllowedBlogSlugs];

  if (!meta) {
    return {
      title: 'Blog Post Not Found',
      description: 'The requested blog post could not be found.',
    };
  }

  return buildPostMetadata(meta);
}

export default async function SlugBlogPage({ params }: SlugPageProps) {
  const { slug } = (await params) ?? {};

  const props = getPostDetailProps('blog', slug);
  if (!props) return redirect(BLOG_LINK.href);

  return <PostDetailLayout {...props} />;
}

export function generateStaticParams() {
  return blogPageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
