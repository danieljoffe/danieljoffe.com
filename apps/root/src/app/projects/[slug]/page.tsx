import Script from 'next/script';
import { headers } from 'next/headers';
import Container from '@/components/Container';
import { projectPagesMetadata } from '@/data/metadata/project';
import { AllowedProjectSlugs, NavLinkI, SlugPagePropsI } from '@/types/base';
import { projectsRecords } from '@/data/projectThumbnails';
import { redirect } from 'next/navigation';
import PostBody from '@/components/PostBody';
import { projectStructuredData } from '@/data/structuredData/project';
import { projectPageSlugs } from '@/data/project';
import { PROJECTS_LINK } from '@/utils/base';

export async function generateMetadata({ params }: SlugPagePropsI) {
  const { slug } = await params;
  const record = projectPagesMetadata[slug as AllowedProjectSlugs];

  if (!record) {
    return {
      title: 'Project Not Found',
      description: 'The requested project page could not be found.',
    };
  }

  return record;
}

export default async function ProjectPage({ params }: SlugPagePropsI) {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;
  const { slug } = (await params) ?? {};
  const { default: Post } = await import(`@/data/content/projects/${slug}.mdx`);
  const record = projectsRecords[slug as AllowedProjectSlugs];

  if (!record) return redirect(PROJECTS_LINK.href);

  const structuredData = projectStructuredData[slug as AllowedProjectSlugs];

  const breadcrumbs: NavLinkI[] = [
    PROJECTS_LINK,
    {
      href: `${PROJECTS_LINK.href}/${slug}`,
      label: record.title,
    },
  ];

  return (
    <>
      <Container>
        <PostBody cover={record.cover} breadcrumbs={breadcrumbs}>
          <Post />
        </PostBody>
      </Container>
      <Script
        id={`${slug}-breadcrumb-structured-data`}
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
        nonce={nonce}
      />
    </>
  );
}

export function generateStaticParams() {
  return projectPageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
