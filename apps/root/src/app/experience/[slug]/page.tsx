import { redirect } from 'next/navigation';
import { AllowedExperienceSlugs, NavLink, SlugPageProps } from '@/types/base';
import { EXPERIENCE_LINK } from '@/utils/constants';
import { experienceRecords } from '@/data/experienceThumbnails';
import { experienceMdxComponents } from '@/data/content/experience';
import { experiencePageSlugs } from '@/data/experience';
import { experiencePagesMetadata } from '@/data/metadata/experience';
import { experienceStructuredData } from '@/data/structuredData/experience';
import { PageContainer, Section } from '@danieljoffe.com/shared-ui';
import PostBody from '@/components/PostBody';

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

export default async function SlugExperiencePage({ params }: SlugPageProps) {
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
    <Section className='min-h-min max-h-max'>
      <PageContainer>
        <PostBody cover={record.cover} breadcrumbs={breadcrumbs}>
          <article className='max-w-3xl mx-auto py-10 lg:py-16'>
            <Post />
          </article>
        </PostBody>
      </PageContainer>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
    </Section>
  );
}

export function generateStaticParams() {
  return experiencePageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
