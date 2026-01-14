import BreadCrumbs from '@/components/units/BreadCrumbs';
import { PROJECTS_LINK } from '@/components/assembled/Nav/Links';
import { pagesRecords } from '../constants';
import UnsplashImage from '@/components/assembled/UnsplashImage';
import { Metadata } from 'next';
import { projectMetadata } from './metadata';
import Script from 'next/script';
import { headers } from 'next/headers';
import { DOMAIN_URL } from '@/utils/constants';
import Container from '@/components/units/Container';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = projectMetadata[slug as keyof typeof projectMetadata];
  if (!item) {
    return {
      title: 'Project Not Found',
      description: 'The requested project page could not be found.',
    };
  }

  return item;
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;
  const { slug } = await params;
  const { default: Post } = await import(`@/data/content/projects/${slug}.mdx`);
  const { link, cover } = pagesRecords[slug as keyof typeof pagesRecords];

  // Breadcrumb structured data
  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: DOMAIN_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: PROJECTS_LINK.label,
        item: `${DOMAIN_URL}${PROJECTS_LINK.href}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: link.label,
        item: `${DOMAIN_URL}${link.href}`,
      },
    ],
  };

  return (
    <Container>
      <div className='flex flex-col gap-4'>
        <BreadCrumbs items={[PROJECTS_LINK, link]} />
        <div className='flex flex-col gap-12'>
          <div className='overflow-hidden'>
            <UnsplashImage
              src={cover.src}
              alt={cover.alt}
              origin={cover.origin}
              creator={cover.creator}
              priority={true}
              fetchPriority='high'
              blurHash={cover.blurHash}
              width={800}
              height={450}
            />
          </div>
          <div className='flex-1 flex flex-col items-center'>
            <div
              className={[
                'prose prose-headings:font-sans prose-headings:font-medium',
                'prose-base prose-body:font-serif w-full',
              ].join(' ')}
            >
              <Post />
            </div>
          </div>
        </div>
      </div>
      <Script
        id={`${slug}-breadcrumb-structured-data`}
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
        nonce={nonce}
      />
    </Container>
  );
}

export function generateStaticParams() {
  return Object.keys(pagesRecords).map(slug => ({ slug }));
}

export const dynamicParams = false;
