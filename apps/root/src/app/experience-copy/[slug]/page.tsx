import { redirect } from 'next/navigation';
import { AllowedExperienceSlugs, NavLink, SlugPageProps } from '@/types/base';
import { EXPERIENCE_LINK } from '@/utils/constants';
import { experienceRecords } from '@/data/experienceThumbnails';
import { experienceMdxComponents } from '@/data/content/experience';
import { experiencePageSlugs } from '@/data/experience';
import { experiencePagesMetadata } from '@/data/metadata/experience';
import { experienceStructuredData } from '@/data/structuredData/experience';
import PostBody from '@/components/PostBody';
import MainContent from '@/components/MainContent';

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params;
  const record = experiencePagesMetadata[slug as AllowedExperienceSlugs];

  if (!record) {
    return {
      title: 'Work Experience Not Found',
      description: 'The requested work experience could not be found.',
    };
  }

  return record;
}

export default async function SlugExperienceCopyPage({
  params,
}: SlugPageProps) {
  const { slug } = (await params) ?? {};

  const Post = experienceMdxComponents[slug as AllowedExperienceSlugs];
  const record = experienceRecords[slug as AllowedExperienceSlugs];

  if (!record || !Post) return redirect(EXPERIENCE_LINK.href);

  const structuredData =
    experienceStructuredData[slug as AllowedExperienceSlugs];

  const breadcrumbs: NavLink[] = [
    EXPERIENCE_LINK,
    {
      href: `${EXPERIENCE_LINK.href}/${slug}`,
      label: record.title,
    },
  ];

  return (
    <section className='min-h-min max-h-max'>
      <div className='max-w-3xl mx-auto px-6 lg:px-0'>
        <PostBody cover={record.cover} breadcrumbs={breadcrumbs}>
          <MainContent>
            <Post />
          </MainContent>
        </PostBody>
      </div>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
    </section>
  );
}

export function generateStaticParams() {
  return experiencePageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
