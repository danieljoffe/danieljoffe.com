import { redirect } from 'next/navigation';
import { AllowedProjectSlugs, NavLink, SlugPageProps } from '@/types/base';
import { PROJECTS_LINK } from '@/utils/constants';
import { projectPagesMetadata } from '@/data/metadata/project';
import { projectsRecords } from '@/data/projectThumbnails';
import { projectStructuredData } from '@/data/structuredData/project';
import { projectPageSlugs } from '@/data/project';
import { projectMdxComponents } from '@/data/content/projects';
import { getProjectPagination } from '@/data/contentOrder';
import PostBody from '@/components/PostBody';
import { PostPagination } from '@/components/kit';

export async function generateMetadata({ params }: SlugPageProps) {
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

export default async function SlugProjectPage({ params }: SlugPageProps) {
  const { slug } = (await params) ?? {};

  const Post = projectMdxComponents[slug as AllowedProjectSlugs];
  const record = projectsRecords[slug as AllowedProjectSlugs];

  if (!record || !Post) return redirect(PROJECTS_LINK.href);

  const structuredData = projectStructuredData[slug as AllowedProjectSlugs];
  const pagination = getProjectPagination(slug as AllowedProjectSlugs);

  const breadcrumbs: NavLink[] = [
    PROJECTS_LINK,
    {
      href: `${PROJECTS_LINK.href}/${slug}`,
      label: record.title,
    },
  ];

  return (
    <section className='w-full overflow-hidden flex flex-col justify-center'>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <PostBody cover={record.cover} breadcrumbs={breadcrumbs}>
          <article className='max-w-3xl mx-auto py-10 lg:py-16'>
            <Post />
          </article>
          <PostPagination pagination={pagination} />
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
  return projectPageSlugs.map(slug => ({ slug }));
}

export const dynamicParams = false;
