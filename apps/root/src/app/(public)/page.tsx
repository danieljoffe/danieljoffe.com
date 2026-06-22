import type { Metadata } from 'next';
import {
  MapPin,
  Briefcase,
  Mail,
  Heart,
  ArrowUpRight,
  Zap,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Container } from '@danieljoffe/shared-ui/Container';
import { CTACard } from '@danieljoffe/shared-ui/CTACard';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';
import { SectionLabel } from '@danieljoffe/shared-ui/SectionLabel';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { IconText } from '@danieljoffe/shared-ui/IconText';
import { Text } from '@danieljoffe/shared-ui/Text';
import { homeMetadata } from '@/data/metadata/home';
import { offerings } from '@/data/offerings';
import { getContentByType } from '@/data/contentRegistry';
import {
  FULL_NAME,
  PROJECTS_LINK,
  ABOUT_LINK,
  CONTACT_FORM_ID,
  EXPERIENCE_LINK,
  WYRDFOLD_URL,
} from '@/utils/constants';
import {
  CompanyLogo,
  PostCard,
  TrackedButtonLink,
  TrackedExternalLink,
} from '@/components/kit';
import { cardBase } from '@/lib/layoutStyles';
import { cn } from '@/lib/cn';
import { ScrollReveal } from '@/components/ScrollReveal';
import { HeroBackdrop } from '@/components/HeroBackdrop';
import HeroActions from '../home/HeroActions';

export const metadata: Metadata = homeMetadata;

const companies = getContentByType('experience').map(e => ({
  slug: e.slug,
  company: e.metadata.company ?? e.metadata.title,
  logo: e.metadata.logo,
}));
// Reversed so the grid leads with the newest, full-stack flagship work
// (WyrdFold, api-performance, job-pipeline) rather than the oldest frontend
// studies — matches the descending order on /projects.
const featuredProjects = getContentByType('project')
  .filter(e => e.thumbnail.featured)
  .reverse()
  .map(e => e.thumbnail);

export default function Index() {
  return (
    <PageLayout>
      <ScrollReveal />
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section
        padding='none'
        contain='none'
        overflow='hidden'
        className='py-8 md:py-12'
      >
        <HeroBackdrop />
        <Container size='sm'>
          <div className='relative space-y-6'>
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
              <IconText icon={<Briefcase className='h-3.5 w-3.5' />}>
                10+ years
              </IconText>
            </div>

            <Heading variant='hero'>{FULL_NAME}</Heading>
            <Text variant='subtitle' className='max-w-2xl'>
              Senior frontend engineer turned full-stack. I ship complete
              products: Next.js frontends, Python/FastAPI backends, Postgres,
              and the LLM pipelines in between.
            </Text>

            <HeroActions />
          </div>
        </Container>
      </Section>

      {/* ══════════════════════════════════
          CURRENTLY BUILDING — single product. A list would go stale; one
          card with a live-status indicator signals momentum without
          maintenance cost.
          ══════════════════════════════════ */}
      <Section padding='none' className='reveal'>
        <SectionLabel
          icon={<Sparkles className='h-3.5 w-3.5' />}
          label='Currently building'
        />
        <TrackedExternalLink
          ctaName='home_wyrdfold_card'
          href={WYRDFOLD_URL}
          className={cn(
            cardBase,
            'group block p-5 hover:border-border-secondary transition-colors'
          )}
        >
          <div className='flex items-start justify-between gap-4'>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <Heading variant='cardTitle'>WyrdFold</Heading>
                <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300'>
                  <span
                    className='h-1.5 w-1.5 rounded-full bg-emerald-600'
                    aria-hidden='true'
                  />
                  Live
                </span>
              </div>
              <Text variant='body'>
                An AI-powered job-search product I built and run solo: resume
                tailoring, job ingestion, and match scoring, with the production
                LLM pipelines (versioned prompts, shadow runs, async
                observability) behind them.
              </Text>
            </div>
            <ArrowUpRight
              className='h-5 w-5 text-text-tertiary group-hover:text-text-primary transition-colors shrink-0 mt-1'
              aria-hidden='true'
            />
          </div>
        </TrackedExternalLink>
        <div className='mt-3 flex flex-wrap gap-2'>
          <TrackedButtonLink
            ctaName='home_wyrdfold_case_study'
            href='/projects/wyrdfold-case-study'
            variant='secondary'
            size='sm'
          >
            Read the case study
            <ArrowUpRight className='h-4 w-4' />
          </TrackedButtonLink>
          <TrackedButtonLink
            ctaName='home_llm_pipelines'
            href='/blog/operating-llm-pipelines-in-production'
            variant='ghost'
            size='sm'
          >
            How I operate the LLM pipelines
            <ArrowUpRight className='h-4 w-4' />
          </TrackedButtonLink>
        </div>
      </Section>

      {/* ══════════════════════════════════
          ACHIEVEMENTS — surfaced to the first screen so concrete metrics
          land before the visitor's attention drifts past the hero.
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Zap className='h-3.5 w-3.5' />}
          label='Achievements'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 reveal-stagger'>
          {offerings.achievements.map((achievement, i) => (
            <div key={i} className={cn(cardBase, 'p-4')}>
              <IconText
                icon={<achievement.Icon className='h-5 w-5 text-brand-500' />}
                className='gap-x-3'
              >
                <Heading variant='cardTitle'>{achievement.metric}</Heading>
              </IconText>
              <Text variant='body' className='mt-1'>
                {achievement.text}
              </Text>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          PREVIOUS TEAMS
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Briefcase className='h-3.5 w-3.5' />}
          label="Teams I've worked with"
        />
        <div className='space-y-6'>
          <Text variant='bodyLg'>
            I&apos;ve worked with these companies to build frontends that are
            fast, accessible, and genuinely good to use.
          </Text>
          <ul className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 reveal-stagger'>
            {companies.map(company => (
              <li key={company.slug} className='flex justify-center'>
                {company.logo && (
                  <a
                    href={`${EXPERIENCE_LINK.href}/${company.slug}`}
                    aria-label={company.company}
                    className='opacity-60 grayscale transition duration-300 hover:scale-105 hover:opacity-100 hover:grayscale-0'
                  >
                    <CompanyLogo
                      src={company.logo}
                      alt={company.company}
                      size='lg'
                    />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ══════════════════════════════════
          FEATURED PROJECTS
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Layers className='h-3.5 w-3.5' />}
          label='Featured Projects'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 reveal-stagger'>
          {featuredProjects.map((project, i) => (
            <PostCard key={project.slug} post={project} priority={i < 3} />
          ))}
        </div>
        <div className='flex justify-center pt-4'>
          <TrackedButtonLink
            ctaName='home_view_all_projects'
            href={PROJECTS_LINK.href}
            variant='secondary'
            size='sm'
          >
            View all projects
            <ArrowUpRight className='h-4 w-4' />
          </TrackedButtonLink>
        </div>
      </Section>

      {/* ══════════════════════════════════
          METHODOLOGY
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Heart className='h-3.5 w-3.5' />}
          label='How I Think'
        />
        <div className='grid gap-4 sm:grid-cols-2 reveal-stagger'>
          {offerings.methodology.map((methodology, i) => (
            <div
              key={i}
              className={cn(
                cardBase,
                'p-4 hover:border-border-secondary transition-colors'
              )}
            >
              <div className='space-y-2'>
                <IconText
                  icon={<methodology.Icon className='h-4 w-4 text-brand-500' />}
                >
                  <Heading variant='cardTitle'>{methodology.title}</Heading>
                </IconText>
                <Text variant='body'>{methodology.text}</Text>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          CTA / CONTACT
          ══════════════════════════════════ */}
      <Section padding='none' className='reveal'>
        <CTACard
          heading='Senior full-stack engineering, frontend included.'
          description={
            <>
              Open to full-time roles with product-focused teams. If the
              frontend has to be excellent and you want one engineer who can own
              the whole stack, let&apos;s talk.
            </>
          }
        >
          <div className='flex flex-wrap justify-center gap-3'>
            <TrackedButtonLink
              ctaName='home_start_conversation'
              href={`${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`}
              size='sm'
            >
              <Mail className='h-4 w-4' />
              Start a conversation
            </TrackedButtonLink>
            <TrackedButtonLink
              ctaName='home_view_my_work'
              href={PROJECTS_LINK.href}
              variant='secondary'
              size='sm'
            >
              <ArrowUpRight className='h-4 w-4' />
              View my work
            </TrackedButtonLink>
          </div>
        </CTACard>
      </Section>
    </PageLayout>
  );
}
