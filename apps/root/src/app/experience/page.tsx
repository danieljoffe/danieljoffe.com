import { Metadata } from 'next';
import { Briefcase, ArrowUpRight, Calendar, Layers } from 'lucide-react';
import { getContentByType } from '@/data/contentRegistry';
import { experienceRootMetadata } from '@/data/metadata/experience';
import { experienceRootStructuredData } from '@/data/structuredData/experience';
import { experienceFull } from '@/data/experience';
import {
  Section,
  SectionLabel,
  PageLayout,
  PostCard,
  StructuredData,
  CompanyLogo,
} from '@/components/kit';
import ExperienceCardLink from './ExperienceCardLink';

const experienceEntries = getContentByType('experience');
const experienceList = experienceEntries
  .reverse()
  .map(entry => ({
    ...entry.thumbnail,
    readingTime: entry.readingTime,
  }));
const experienceFullList = Object.values(experienceFull).reverse();

export const metadata: Metadata = experienceRootMetadata;

export default function ExperiencePage() {
  return (
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section>
        <div className='text-center space-y-4'>
          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            Experience
          </h1>
          <p className='text-lg text-text-secondary max-w-xl mx-auto'>
            An overview of my professional journey as a frontend
            engineer&mdash;covering key roles, impactful projects, and the
            technical expertise I bring to building performant, user-focused web
            applications.
          </p>
        </div>
      </Section>

      {/* ══════════════════════════════════
          TIMELINE
          ══════════════════════════════════ */}
      <Section>
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
                const full = experienceFullList.find(f => f.slug === exp.slug);
                return (
                  <ExperienceCardLink
                    key={exp.slug}
                    href={exp.link.href}
                    slug={exp.slug}
                  >
                    {/* Company logo */}
                    {full?.logo ? (
                      <CompanyLogo
                        src={full.logo}
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
                          <p className='text-sm font-semibold text-text-primary'>
                            {exp.title}
                          </p>
                          {exp.role && (
                            <p className='text-xs text-brand-500 font-medium mt-0.5'>
                              {exp.role}
                            </p>
                          )}
                        </div>
                        <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity' />
                      </div>
                      <p className='text-sm text-text-secondary mt-1 leading-relaxed'>
                        {exp.description}
                      </p>
                      {exp.duration && (
                        <div className='flex items-center gap-1.5 mt-2'>
                          <Calendar className='h-3 w-3 text-text-tertiary' />
                          <span className='text-xs text-text-tertiary'>
                            {exp.duration}
                          </span>
                        </div>
                      )}
                    </div>
                  </ExperienceCardLink>
                );
              })}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════
          GRID VIEW
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Layers className='h-3.5 w-3.5' />}
          label='At a Glance'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {experienceList.map((exp, i) => {
            const full = experienceFullList.find(f => f.slug === exp.slug);
            return (
              <PostCard
                key={exp.slug}
                post={exp}
                logo={full?.logo}
                priority={i < 2}
                analyticsType='experience'
              />
            );
          })}
        </div>
      </Section>

      <StructuredData data={experienceRootStructuredData} />
    </PageLayout>
  );
}
