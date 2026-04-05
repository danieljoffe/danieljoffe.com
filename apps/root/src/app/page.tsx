import type { Metadata } from 'next';
import {
  MapPin,
  Briefcase,
  Mail,
  Heart,
  ArrowUpRight,
  Zap,
  Layers,
} from 'lucide-react';
import { homeMetadata } from '@/data/metadata/home';
import { offerings } from '@/data/offerings';
import { experienceFull } from '@/data/experience';
import { getContentByType } from '@/data/contentRegistry';
import {
  FULL_NAME,
  JOB_TITLE,
  PROJECTS_LINK,
  ABOUT_LINK,
  CONTACT_FORM_ID,
  EXPERIENCE_LINK,
} from '@/utils/constants';
import { CTACard } from '@danieljoffe.com/shared-ui/CTACard';
import { GridBg } from '@danieljoffe.com/shared-ui/GridBg';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { SectionLabel } from '@danieljoffe.com/shared-ui/SectionLabel';
import { CompanyLogo, PostCard } from '@/components/kit';
import { cardBase } from '@/lib/layoutStyles';
import { cn } from '@/lib/cn';
import Button from '@/components/Button';
import HeroActions from './home/HeroActions';

export const metadata: Metadata = homeMetadata;

const companies = Object.values(experienceFull);
const featuredProjects = getContentByType('project')
  .filter(e => e.thumbnail.featured)
  .map(e => e.thumbnail);

export default function Index() {
  return (
    <PageLayout className='py-16 lg:py-24 space-y-24'>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section>
        <GridBg />
        <div className='relative space-y-6'>
          <div className='flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-tertiary'>
            <span className='flex items-center gap-1.5'>
              <MapPin className='h-3.5 w-3.5' />
              Los Angeles, CA
            </span>
            <span className='flex items-center gap-1.5'>
              <Briefcase className='h-3.5 w-3.5' />
              10+ years
            </span>
          </div>

          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            {FULL_NAME}
          </h1>
          <p className='text-lg text-text-secondary max-w-lg leading-relaxed'>
            {JOB_TITLE} who builds products end-to-end &mdash; from backend
            systems to polished UIs. I ship fast, architect for scale, and
            eliminate the bottlenecks that slow teams down.
          </p>

          <HeroActions />
        </div>
      </Section>

      {/* ══════════════════════════════════
          PREVIOUS TEAMS
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Briefcase className='h-3.5 w-3.5' />}
          label="Teams I've worked with"
        />
        <div className='space-y-6'>
          <p className='text-base text-text-secondary leading-relaxed'>
            I&apos;ve worked with these companies to build fast, beautiful, and
            inclusive digital experiences.
          </p>
          <ul className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6'>
            {companies.map(company => (
              <li
                key={company.slug}
                className='flex justify-center opacity-70 hover:opacity-100 transition-opacity'
              >
                <a href={`${EXPERIENCE_LINK.href}/${company.slug}`}>
                  <CompanyLogo
                    src={company.logo}
                    alt={company.company}
                    size='lg'
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ══════════════════════════════════
          ACHIEVEMENTS
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Zap className='h-3.5 w-3.5' />}
          label='Achievements'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          {offerings.achievements.map((achievement, i) => (
            <div key={i} className={cn(cardBase, 'p-4 flex items-start gap-3')}>
              <achievement.Icon className='h-5 w-5 text-brand-500 shrink-0 mt-0.5' />
              <div>
                <p className='text-sm font-semibold text-text-primary'>
                  {achievement.metric}
                </p>
                <p className='text-sm text-text-secondary mt-1 leading-relaxed'>
                  {achievement.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          FEATURED PROJECTS
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Layers className='h-3.5 w-3.5' />}
          label='Featured Projects'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {featuredProjects.map((project, i) => (
            <PostCard key={project.slug} post={project} priority={i < 3} />
          ))}
        </div>
        <div className='flex justify-center pt-4'>
          <Button
            as='link'
            href={PROJECTS_LINK.href}
            variant='secondary'
            size='sm'
          >
            View all projects
            <ArrowUpRight className='h-4 w-4' />
          </Button>
        </div>
      </Section>

      {/* ══════════════════════════════════
          METHODOLOGY
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Heart className='h-3.5 w-3.5' />}
          label='How I Work'
        />
        <div className='grid gap-4 sm:grid-cols-2'>
          {offerings.methodology.map((methodology, i) => (
            <div
              key={i}
              className={cn(
                cardBase,
                'p-4 hover:border-border-secondary transition-colors'
              )}
            >
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <methodology.Icon className='h-4 w-4 text-brand-500' />
                  <p className='text-sm font-semibold text-text-primary'>
                    {methodology.title}
                  </p>
                </div>
                <p className='text-sm text-text-secondary leading-relaxed'>
                  {methodology.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          CTA / CONTACT
          ══════════════════════════════════ */}
      <Section>
        <CTACard
          heading="Let's Build Something Great Together"
          description={
            <>
              Available for full-stack engineering roles &mdash; Q1 2026.
              Let&apos;s talk about your project.
            </>
          }
        >
          <div className='flex flex-wrap justify-center gap-3'>
            <Button
              as='link'
              href={`${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`}
              size='sm'
            >
              <Mail className='h-4 w-4' />
              Start a conversation
            </Button>
            <Button
              as='link'
              href={PROJECTS_LINK.href}
              variant='secondary'
              size='sm'
            >
              <ArrowUpRight className='h-4 w-4' />
              View my work
            </Button>
          </div>
        </CTACard>
      </Section>
    </PageLayout>
  );
}
