import Container from '@/components/units/Container';
import { experience } from './workHistory';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ABOUT_LINK, EXPERIENCE_LINK } from '@/components/assembled/Nav/Links';
import { DOMAIN_URL, FULL_NAME } from '@/utils/constants';
import UnsplashImage from '@/components/assembled/UnsplashImage';
import Script from 'next/script';
import { headers } from 'next/headers';
import BreadCrumbs from '@/components/units/BreadCrumbs';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = experience[slug as keyof typeof experience];

  if (!item) {
    return {
      title: 'Experience Not Found',
      description: 'The requested experience page could not be found.',
    };
  }

  const description = `${item.description}. ${item.challenge[0]?.substring(
    0,
    100
  )}...`;

  return {
    title: `${item.role} at ${item.company}`,
    description,
    keywords: [
      FULL_NAME,
      item.company,
      item.role,
      'Experience',
      'Work History',
      'Professional Experience',
      'Software Engineer',
      'Full-Stack Engineer',
    ],
    openGraph: {
      title: `${item.role} at ${item.company} - ${FULL_NAME}`,
      description,
      siteName: FULL_NAME,
      url: [DOMAIN_URL, EXPERIENCE_LINK.href, `/${slug}`].join(''),
      images: [
        {
          url: item.cover.src,
          width: 800,
          height: 400,
          alt: item.cover.alt,
        },
      ],
    },
    alternates: {
      canonical: `${EXPERIENCE_LINK.href}/${slug}`,
    },
    twitter: {
      title: `${item.role} at ${item.company} - ${FULL_NAME}`,
      description,
      images: [item.cover.src],
    },
  };
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;
  const { slug } = await params;
  const item = experience[slug as keyof typeof experience];

  if (!item) {
    return redirect(ABOUT_LINK.href);
  }

  // Structured data for work experience
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: item.role,
    companyName: item.company,
    description: item.description,
    datePosted: item.year,
    employmentType: 'Full-time',
    jobLocation: {
      '@type': 'Place',
      addressCountry: 'US',
    },
    applicant: {
      '@type': 'Person',
      name: FULL_NAME,
      jobTitle: 'Full-Stack Engineer',
    },
  };

  return (
    <>
      <UnsplashImage
        src={item.cover.src}
        alt={item.cover.alt}
        creator={item.cover.creator}
        origin={item.cover.origin}
        priority={true}
        fetchPriority='high'
        blurHash={item.cover.blurHash}
        width={800}
        height={450}
      />
      <Container className='gap-4'>
        <BreadCrumbs
          items={[
            {
              href: ABOUT_LINK.href,
              label: EXPERIENCE_LINK.label,
            },
            item.link,
          ]}
        />
        <article className='flex flex-col gap-4'>
          <header className='flex flex-col md:flex-row items-center gap-4'>
            <div
              className={[
                'flex items-center justify-center bg-neutral-100',
                'rounded-full p-4 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
                'border-1 border-neutral-100 border-neutral-200',
              ].join(' ')}
            >
              <Image
                src={item.logo}
                alt={`${item.company} logo`}
                width={96}
                height={96}
                priority={true}
                fetchPriority='high'
                sizes='(max-width: 640px) 4rem, (max-width: 768px) 5rem, 6rem'
                unoptimized={true}
              />
            </div>
            <div className='flex flex-col gap-2 text-center md:text-left'>
              <h1 className='text-4xl m-0'>{item?.company}</h1>
              <h2 className='m-0 flex-1 h4'>{item.year}</h2>
              <h3 className='m-0 h5'>{item.role}</h3>
            </div>
          </header>
          <div className='flex flex-col gap-4 h-full'>
            <section>
              <h3 className='h5'>The Context</h3>
              <p>{item.description}</p>
            </section>
            <section>
              <h3 className='h5'>The Challenge</h3>
              <p> {item.challenge}</p>
            </section>
            <section>
              <h3 className='h5'>The Solution</h3>
              <p> {item.solution}</p>
            </section>
            <section>
              <h3 className='h5'>The Impact</h3>
              <p> {item.impact}</p>
            </section>
            <section>
              <h3 className='h5'>Lessons Learned</h3>
              <p> {item.learned}</p>
            </section>
            <section>
              <h3 className='h5'>The Tech Stack</h3>
              <p> {item.tech}</p>
            </section>
          </div>
        </article>
      </Container>
      <Script
        id={`${slug}-structured-data`}
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
        nonce={nonce}
      />
    </>
  );
}
