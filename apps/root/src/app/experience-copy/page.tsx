import { Metadata } from 'next';
import { Briefcase, ArrowUpRight, Calendar, Layers } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { experienceRecords } from '@/data/experienceThumbnails';
import { experienceRootMetadata } from '@/data/metadata/experience';
import { experienceRootStructuredData } from '@/data/structuredData/experience';
import { experienceFull } from '@/data/experience';
import ExperienceCardLink from './ExperienceCardLink';

const experienceList = Object.values(experienceRecords);
const experienceFullList = Object.values(experienceFull);

export const metadata: Metadata = experienceRootMetadata;

/* ─── Section wrapper ─── */
function Section({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative px-6 lg:px-0 ${className}`}>
      {children}
    </section>
  );
}

/* ─── Section header with icon + divider ─── */
function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className='flex items-center gap-2 mb-8'>
      <div className='p-1.5 rounded-md bg-surface-tertiary text-text-secondary'>
        {icon}
      </div>
      <span className='text-xs font-semibold uppercase tracking-wider text-text-tertiary'>
        {label}
      </span>
      <div className='flex-1 h-px bg-border ml-2' />
    </div>
  );
}

/* ════════════════════════════════════════════════
   EXPERIENCE PAGE COPY
   ════════════════════════════════════════════════ */
export default function ExperienceCopy() {
  return (
    <main className='max-w-3xl mx-auto py-16 lg:py-24 space-y-24'>
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
          {/* Vertical line */}
          <div className='absolute left-[19px] top-0 bottom-0 w-px bg-border' />

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
                    {/* Timeline dot */}
                    <div className='relative z-10 shrink-0'>
                      <div
                        className={[
                          'h-10 w-10 rounded-full flex items-center justify-center border-2',
                          i === experienceList.length - 1
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-border bg-surface-secondary',
                        ].join(' ')}
                      >
                        {full?.logo ? (
                          <Image
                            src={full.logo}
                            alt={`${exp.title} logo`}
                            width={20}
                            height={20}
                            className={`object-contain ${full.invert ? 'dark:invert' : ''}`}
                          />
                        ) : (
                          <Briefcase className='h-4 w-4 text-text-tertiary' />
                        )}
                      </div>
                    </div>

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
              <Link
                key={exp.slug}
                href={exp.link.href}
                className={[
                  'group relative overflow-hidden rounded-xl border border-border bg-surface-secondary',
                  'transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg/5',
                  i === experienceList.length - 1 ? 'sm:col-span-2' : '',
                ].join(' ')}
              >
                {/* Cover image */}
                <div className='relative h-36 overflow-hidden'>
                  <Image
                    src={exp.cover.src}
                    alt={exp.cover.alt}
                    fill
                    className='object-cover transition-transform duration-300 group-hover:scale-105'
                    sizes='(max-width: 640px) 100vw, 50vw'
                    priority={i < 2}
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
                  {full?.logo && (
                    <div className='absolute bottom-3 left-3'>
                      <div className='h-8 w-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center p-1.5'>
                        <Image
                          src={full.logo}
                          alt=''
                          width={20}
                          height={20}
                          className='object-contain'
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className='p-4 space-y-2'>
                  <div className='flex items-start justify-between gap-2'>
                    <p className='text-sm font-semibold text-text-primary'>
                      {exp.title}
                    </p>
                    <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
                  </div>
                  {exp.role && (
                    <span className='inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-medium'>
                      {exp.role}
                    </span>
                  )}
                  <p className='text-sm text-text-secondary leading-relaxed line-clamp-2'>
                    {exp.description}
                  </p>
                  {exp.duration && (
                    <div className='flex items-center gap-1.5'>
                      <Calendar className='h-3 w-3 text-text-tertiary' />
                      <span className='text-xs text-text-tertiary'>
                        {exp.duration}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(experienceRootStructuredData).replace(
            /</g,
            '\\u003c'
          ),
        }}
      />
    </main>
  );
}
