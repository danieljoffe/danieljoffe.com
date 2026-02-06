import { redirect } from 'next/navigation';
import { AllowedProjectSlugs, NavLinkI, SlugPagePropsI } from '@/types/base';
import { PROJECTS_LINK } from '@/utils/base';
import { projectPagesMetadata } from '@/data/metadata/project';
import { projectsRecords } from '@/data/projectThumbnails';
import { projectStructuredData } from '@/data/structuredData/project';
import { projectPageSlugs } from '@/data/project';
import { projectMdxComponents } from '@/data/content/projects';
import { PageContainer, Section } from '@danieljoffe.com/shared-ui';
import PostBody from '@/components/PostBody';
import MainContent from '@/components/MainContent';

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

export default async function SlugProjectPage({ params }: SlugPagePropsI) {
  const { slug } = (await params) ?? {};

  const Post = projectMdxComponents[slug as AllowedProjectSlugs];
  const record = projectsRecords[slug as AllowedProjectSlugs];

  if (!record || !Post) return redirect(PROJECTS_LINK.href);

  const structuredData = projectStructuredData[slug as AllowedProjectSlugs];

  const breadcrumbs: NavLinkI[] = [
    PROJECTS_LINK,
    {
      href: `${PROJECTS_LINK.href}/${slug}`,
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
  return projectPageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
