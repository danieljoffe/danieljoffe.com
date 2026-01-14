import { redirect } from 'next/navigation';
import Script from 'next/script';
import { EXPERIENCE_LINK } from '@/components/assembled/Nav/Links';
import PostBody from '@/components/PostBody';
import Container from '@/components/units/Container';
import { experienceRecords } from '@/data/experienceThumbnails';
import { AllowedExperienceSlugs, NavLink, SlugPagePropsI } from '@/types/base';
import { headers } from 'next/headers';
import { experiencePageSlugs } from '@/data/base';
import { experiencePagesMetadata } from '@/data/metadata/experience';
import { experienceStructuredData } from '@/data/structuredData/experience';

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

export default async function ExperiencePage({ params }: SlugPagePropsI) {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;
  const { slug } = (await params) || {};
  const { default: Data } = await import(
    `@/data/content/experience/${slug}.mdx`
  );
  const record = experienceRecords[slug as AllowedExperienceSlugs];
  if (!record) return redirect(EXPERIENCE_LINK.href);

  const structureData =
    experienceStructuredData[slug as AllowedExperienceSlugs];

  const breadcrumbs: NavLink[] = [
    EXPERIENCE_LINK,
    {
      href: `${EXPERIENCE_LINK.href}/${slug}`,
      label: record.title,
    },
  ];

  return (
    <>
      <Container>
        <PostBody cover={record.cover} breadcrumbs={breadcrumbs}>
          <Data />
        </PostBody>
      </Container>
      <Script
        id={`${slug}-structured-data`}
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structureData),
        }}
      />
      nonce={nonce}
    </>
  );
}

export function generateStaticParams() {
  return experiencePageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
