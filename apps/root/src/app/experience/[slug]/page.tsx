import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Script from 'next/script';
import { AllowedExperienceSlugs, NavLinkI, SlugPagePropsI } from '@/types/base';
import { EXPERIENCE_LINK } from '@/utils/base';
import { experienceRecords } from '@/data/experienceThumbnails';
import { experienceMdxComponents } from '@/data/content/experience';
import { experiencePageSlugs } from '@/data/experience';
import { experiencePagesMetadata } from '@/data/metadata/experience';
import { experienceStructuredData } from '@/data/structuredData/experience';
import { PageContainer, Section } from '@danieljoffe.com/ui';
import PostBody from '@/components/PostBody';
import MainContent from '@/components/MainContent';

export async function generateMetadata({ params }: SlugPagePropsI) {
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

export default async function SlugExperiencePage({ params }: SlugPagePropsI) {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;
  const { slug } = (await params) ?? {};

  const Post = experienceMdxComponents[slug as AllowedExperienceSlugs];
  const record = experienceRecords[slug as AllowedExperienceSlugs];

  if (!record || !Post) return redirect(EXPERIENCE_LINK.href);

  const structuredData =
    experienceStructuredData[slug as AllowedExperienceSlugs];

  const breadcrumbs: NavLinkI[] = [
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
          <MainContent>
            <Post />
          </MainContent>
        </PostBody>
      </PageContainer>
      <Script
        id={`${slug}-structured-data`}
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
        nonce={nonce}
      />
    </Section>
  );
}

export function generateStaticParams() {
  return experiencePageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
