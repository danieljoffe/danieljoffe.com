import { redirect } from 'next/navigation';
import { AllowedExperienceSlugs, SlugPageProps } from '@/types/base';
import { EXPERIENCE_LINK } from '@/utils/constants';
import { experienceMdxMetadata } from '@/data/content/experience';
import { experiencePageSlugs } from '@/data/experience';
import { buildPostMetadata } from '@/lib/buildPostMetadata';
import { getPostDetailProps } from '@/lib/getPostDetailProps';
import PostDetailLayout from '@/components/PostDetailLayout';

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params;
  const meta = experienceMdxMetadata[slug as AllowedExperienceSlugs];

  if (!meta) {
    return {
      title: 'Work Experience Not Found',
      description: 'The requested work experience could not be found.',
    };
  }

  return buildPostMetadata(meta);
}

export default async function SlugExperiencePage({ params }: SlugPageProps) {
  const { slug } = (await params) ?? {};

  const props = getPostDetailProps('experience', slug);
  if (!props) return redirect(EXPERIENCE_LINK.href);

  return <PostDetailLayout {...props} />;
}

export function generateStaticParams() {
  return experiencePageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
