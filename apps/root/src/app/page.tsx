import type { Metadata } from 'next';
import {
  MapPin,
  Briefcase,
  Mail,
  Heart,
  Sparkles,
  ArrowUpRight,
  Rocket,
  BarChart3,
  Zap,
  Accessibility,
  Target,
  LayoutTemplate,
  Wrench,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { homeMetadata } from '@/data/metadata/home';
import { offerings } from '@/data/offerings';
import { experienceFull } from '@/data/experience';
import {
  FULL_NAME,
  JOB_TITLE,
  PROJECTS_LINK,
  ABOUT_LINK,
  CONTACT_FORM_ID,
  EXPERIENCE_LINK,
} from '@/utils/constants';
import {
  Section,
  SectionLabel,
  PageLayout,
  CTACard,
  GridBg,
  CompanyLogo,
} from '@/components/kit';
import Button from '@/components/Button';
import HeroActions from './home/HeroActions';

export const metadata: Metadata = homeMetadata;

/* ─── Icon maps ─── */
const achievementIconMap: Record<string, LucideIcon> = {
  Rocket,
  BarChart3,
  Zap,
  Accessibility,
  Target,
  LayoutTemplate,
  Wrench,
  UserCheck,
};

const companies = Object.values(experienceFull);

export default function Index() {
  return (
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section>
        <GridBg />
        <div className='relative space-y-6'>
          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            <span>Hello.</span>
            <br className='hidden md:block' />
            <span> I&apos;m {FULL_NAME}.</span>
          </h1>
          <p className='text-lg text-text-secondary max-w-lg'>{JOB_TITLE}</p>

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

          <div className='space-y-3 text-sm text-text-secondary'>
            <p>I optimize applications.</p>
            <p>I build scalable design systems.</p>
            <p>And I love eliminating engineering bottlenecks.</p>
          </div>

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
          {offerings.achievements.map((achievement, i) => {
            const Icon = achievementIconMap[achievement.icon];
            return (
              <div
                key={i}
                className='p-4 bg-surface-secondary rounded-xl border border-border flex items-start gap-3'
              >
                {Icon && (
                  <Icon className='h-5 w-5 text-brand-500 shrink-0 mt-0.5' />
                )}
                <div>
                  <p className='text-sm font-semibold text-text-primary'>
                    {achievement.metric}
                  </p>
                  <p className='text-sm text-text-secondary mt-1 leading-relaxed'>
                    {achievement.text}
                  </p>
                </div>
              </div>
            );
          })}
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
          {offerings.methodology.map((methodology, i) => {
            return (
              <div
                key={i}
                className='p-4 bg-surface-secondary rounded-xl border border-border hover:border-border-secondary transition-colors'
              >
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Sparkles className='h-4 w-4 text-brand-500' />
                    <p className='text-sm font-semibold text-text-primary'>
                      {methodology.title}
                    </p>
                  </div>
                  <p className='text-sm text-text-secondary leading-relaxed'>
                    {methodology.text}
                  </p>
                </div>
              </div>
            );
          })}
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
              Available for contract projects and fractional engineering
              engagements. Let&apos;s talk about your project.
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
