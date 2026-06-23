import type { Metadata } from 'next';
import {
  Briefcase,
  Code2,
  FolderGit2,
  GraduationCap,
  MapPin,
} from 'lucide-react';
import { Badge } from '@danieljoffe/shared-ui/Badge';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { IconText } from '@danieljoffe/shared-ui/IconText';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';
import { SectionLabel } from '@danieljoffe/shared-ui/SectionLabel';
import { StructuredData } from '@danieljoffe/shared-ui/StructuredData';
import { Text } from '@danieljoffe/shared-ui/Text';
import {
  resumeEducation,
  resumeExperience,
  resumeProjects,
  resumeSkills,
  resumeSummary,
} from '@/data/resume';
import { resumeMetadata } from '@/data/metadata/resume';
import { resumeStructuredData } from '@/data/structuredData/resume';
import { FULL_NAME, JOB_TITLE } from '@/utils/constants';
import { cardBase } from '@/lib/layoutStyles';
import { cn } from '@/lib/cn';
import ResumeActions from './ResumeActions';

export const metadata: Metadata = resumeMetadata;

export default function Resume() {
  return (
    <PageLayout>
      <StructuredData data={resumeStructuredData} />

      {/* ══════════════════════════════════
          HEADER
          ══════════════════════════════════ */}
      <Section padding='none' className='py-8 md:py-12'>
        <div className='space-y-5'>
          <div className='flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-tertiary'>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'>
              <span
                className='h-1.5 w-1.5 rounded-full bg-emerald-600'
                aria-hidden='true'
              />
              Open to full-time roles
            </span>
            <IconText icon={<MapPin className='h-3.5 w-3.5' />}>
              Los Angeles, CA
            </IconText>
          </div>

          <div className='space-y-2'>
            <Heading variant='hero'>{FULL_NAME}</Heading>
            <Text variant='subtitle'>{JOB_TITLE}</Text>
          </div>

          <Text variant='bodyLg' className='max-w-3xl'>
            {resumeSummary}
          </Text>

          <ResumeActions />
        </div>
      </Section>

      {/* ══════════════════════════════════
          TECHNICAL SKILLS
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Code2 className='h-3.5 w-3.5' />}
          label='Technical Skills'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {resumeSkills.map(group => (
            <div key={group.label} className={cn(cardBase, 'p-4')}>
              <Heading variant='cardTitle' className='mb-2'>
                {group.label}
              </Heading>
              <div className='flex flex-wrap gap-1.5'>
                {group.skills.map(skill => (
                  <Badge
                    key={skill}
                    variant='default'
                    size='md'
                    className='font-normal'
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          EXPERIENCE
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Briefcase className='h-3.5 w-3.5' />}
          label='Experience'
        />
        <div className='space-y-4'>
          {resumeExperience.map(role => (
            <div key={role.company} className={cn(cardBase, 'p-5')}>
              <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
                <Heading variant='cardTitle'>{role.company}</Heading>
                <Text variant='detail' className='text-text-tertiary'>
                  {role.period} · {role.location}
                </Text>
              </div>
              <Text variant='body' className='mt-0.5 font-medium'>
                {role.role}
              </Text>
              <ul className='mt-3 list-disc space-y-2 pl-5'>
                {role.bullets.map((bullet, i) => (
                  <li key={i}>
                    <Text variant='body' as='span'>
                      {bullet}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          SELECTED PROJECTS
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<FolderGit2 className='h-3.5 w-3.5' />}
          label='Selected Projects'
        />
        <div className='space-y-3'>
          {resumeProjects.map(project => (
            <div key={project.name} className={cn(cardBase, 'p-4')}>
              <Heading variant='cardTitle' className='mb-1'>
                {project.name}
              </Heading>
              <Text variant='body'>{project.description}</Text>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          EDUCATION
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<GraduationCap className='h-3.5 w-3.5' />}
          label='Education'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {resumeEducation.map(entry => (
            <div key={entry.school} className={cn(cardBase, 'p-4')}>
              <Heading variant='cardTitle'>{entry.school}</Heading>
              <Text variant='body' className='mt-0.5'>
                {entry.credential}
              </Text>
              {entry.detail && (
                <Text variant='detail' className='mt-0.5 text-text-tertiary'>
                  {entry.detail}
                </Text>
              )}
            </div>
          ))}
        </div>
      </Section>
    </PageLayout>
  );
}
