'use client';

import Image from 'next/image';
import LinkHint from '@/components/LinkHint';
import Button from '@/components/Button';
import { experienceFull } from '@/data/experience';
import { analytics } from '@/lib/analytics';
import { EXPERIENCE_LINK } from '@/utils/base';
import { Stack, PageContainer, Section } from '@danieljoffe.com/ui';
import ContentGrid from '@/components/ContentGrid';

const companies = Object.values(experienceFull);

export default function PreviousTeams() {
  return (
    <Section
      aria-labelledby='previous-teams-heading'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer>
        <h2 className='text-center' id='previous-teams-heading'>
          Teams I&apos;ve worked with
        </h2>
        <ContentGrid>
          {companies.map((company, index) => (
            <li className='flex flex-1 justify-center' key={company.slug}>
              <Button
                as='link'
                variant='link'
                size='lg'
                href={`${EXPERIENCE_LINK.href}/${company.slug}`}
                aria-label={company.company}
                title={company.company}
                onClick={() => analytics.experienceClick(company.slug)}
              >
                <Stack
                  direction='horizontal'
                  gap='sm'
                  align='center'
                  justify='center'
                  className='w-full h-full'
                >
                  <Image
                    className='w-full h-full max-w-[10rem] max-h-[5rem] object-contain flex-1'
                    src={company.logo}
                    alt={company.company}
                    width={145}
                    height={45}
                    sizes='(max-width: 640px) 5rem, (max-width: 768px) 6rem, 7rem'
                    unoptimized={true}
                    decoding='async'
                    fetchPriority={index < 2 ? 'high' : 'low'}
                    priority={index < 2}
                    loading={index < 2 ? 'eager' : 'lazy'}
                  />
                  <LinkHint />
                </Stack>
              </Button>
            </li>
          ))}
        </ContentGrid>

        <Stack direction='horizontal' justify='center' className='text-center'>
          <p>
            I&apos;ve worked with these companies to build fast, beautiful, and
            inclusive digital experiences.
          </p>
        </Stack>
      </PageContainer>
    </Section>
  );
}
