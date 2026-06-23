import { Metadata } from 'next';
import { Briefcase, ArrowUpRight, Calendar, Clock } from 'lucide-react';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';
import { SectionLabel } from '@danieljoffe/shared-ui/SectionLabel';
import { StructuredData } from '@danieljoffe/shared-ui/StructuredData';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { IconText } from '@danieljoffe/shared-ui/IconText';
import { Text } from '@danieljoffe/shared-ui/Text';
import { getContentByType } from '@/data/contentRegistry';
import { experienceRootMetadata } from '@/data/metadata/experience';
import { experienceRootStructuredData } from '@/data/structuredData/experience';
import { CompanyLogo } from '@/components/kit';
import ExperienceCardLink from './ExperienceCardLink';

const experienceEntries = getContentByType('experience');
const experienceList = experienceEntries.reverse().map(entry => ({
  ...entry.thumbnail,
  logo: entry.metadata.logo,
  readingTime: entry.readingTime,
}));

export const metadata: Metadata = experienceRootMetadata;

export default function ExperiencePage() {
  return (
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section padding='none' className='py-8 md:py-12'>
        <div className='text-center space-y-4'>
          <Heading variant='hero'>Where I&apos;ve worked, what I built</Heading>
          <Text variant='subtitle' className='max-w-xl mx-auto'>
            Five companies, ten years. Each engagement left the team faster and
            more autonomous than I found them.
          </Text>
        </div>
      </Section>

      {/* ══════════════════════════════════
          TIMELINE
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Briefcase className='h-3.5 w-3.5' />}
          label='Career Timeline'
        />
        <div className='relative'>
          <div className='space-y-4'>
            {experienceList
              .slice()
              .reverse()
              .map((exp, i) => {
                return (
                  <ExperienceCardLink
                    key={exp.slug}
                    href={exp.link.href}
                    slug={exp.slug}
                  >
                    {/* Company logo */}
                    {exp.logo ? (
                      <CompanyLogo
                        src={exp.logo}
                        alt={`${exp.title} logo`}
                        highlight={i === experienceList.length - 1}
                      />
                    ) : (
                      <div className='h-10 w-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0'>
                        <Briefcase className='h-4 w-4 text-text-tertiary' />
                      </div>
                    )}

                    {/* Content */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <Heading variant='cardTitle'>{exp.title}</Heading>
                          {exp.role && (
                            <p className='text-xs text-brand-500 font-medium mt-0.5'>
                              {exp.role}
                            </p>
                          )}
                        </div>
                        <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity' />
                      </div>
                      <Text variant='body' className='mt-1'>
                        {exp.description}
                      </Text>
                      <div className='flex items-center gap-3 mt-2'>
                        {exp.duration && (
                          <IconText
                            icon={
                              <Calendar className='h-3 w-3 text-text-tertiary' />
                            }
                            className='gap-x-1.5'
                          >
                            <Text variant='meta' as='span'>
                              {exp.duration}
                            </Text>
                          </IconText>
                        )}
                        {exp.readingTime > 0 && (
                          <IconText
                            icon={
                              <Clock className='h-3 w-3 text-text-tertiary' />
                            }
                            className='gap-x-1.5'
                          >
                            <Text variant='meta' as='span'>
                              {exp.readingTime} min read
                            </Text>
                          </IconText>
                        )}
                      </div>
                    </div>
                  </ExperienceCardLink>
                );
              })}
          </div>
        </div>
      </Section>

      <StructuredData data={experienceRootStructuredData} />
    </PageLayout>
  );
}
