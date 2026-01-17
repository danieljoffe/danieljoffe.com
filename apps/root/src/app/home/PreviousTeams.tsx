'use client';

import Container from '@/components/Container';
import Image from 'next/image';
import LinkHint from '@/components/LinkHint';
import Button from '@/components/Button';
import { experienceFull } from '@/data/experience';
import { analytics } from '@/lib/analytics';
import { EXPERIENCE_LINK } from '@/utils/base';
import ContentGrid from '@/components/ContentGrid';
import Section from '@/components/Section';

const companies = Object.values(experienceFull);

export default function PreviousTeams() {
  return (
    <Section ariaLabelBy='previous-teams-heading'>
      <Container>
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
                <div className='flex gap-2 w-full h-full items-center justify-center'>
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
                </div>
              </Button>
            </li>
          ))}
        </ContentGrid>

        <div className='flex justify-center text-center'>
          <p>
            I&apos;ve worked with these companies to build fast, beautiful, and
            inclusive digital experiences.
          </p>
        </div>
      </Container>
    </Section>
  );
}
