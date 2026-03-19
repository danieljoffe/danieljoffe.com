import Image from 'next/image';
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
import HeroActions from './HeroActions';

/* ─── Subtle animated grid background ─── */
function GridBg() {
  return (
    <div className='absolute inset-0 overflow-hidden pointer-events-none'>
      <div
        className='absolute inset-0 opacity-[0.03]'
        style={{
          backgroundImage: `linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/5 rounded-full blur-3xl' />
    </div>
  );
}

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

/* ════════════════════════════════════════════════
   HOMEPAGE COPY
   ════════════════════════════════════════════════ */
export default function HomepageCopy() {
  return (
    <main className='max-w-3xl mx-auto py-16 lg:py-24 space-y-24'>
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
                <a
                  href={`${EXPERIENCE_LINK.href}/${company.slug}`}
                  className='flex items-center justify-center w-20 h-20 rounded-xl bg-white border border-border overflow-hidden p-3'
                >
                  <Image
                    className='w-full h-full object-contain'
                    src={company.logo}
                    alt={company.company}
                    width={100}
                    height={50}
                    sizes='(max-width: 640px) 5rem, (max-width: 768px) 6rem, 7rem'
                    unoptimized
                    decoding='async'
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
        <div className='relative overflow-hidden rounded-2xl bg-surface-secondary border border-border p-8 sm:p-12 text-center'>
          <div className='absolute inset-0 bg-brand-500/[0.02]' />
          <div className='relative space-y-4'>
            <h2 className='text-2xl font-bold text-text-primary tracking-tight'>
              Let&apos;s Build Something Great Together
            </h2>
            <p className='text-sm text-text-secondary max-w-md mx-auto'>
              Available for contract projects and fractional engineering
              engagements. Let&apos;s talk about your project.
            </p>
            <div className='flex flex-wrap justify-center gap-3 pt-2'>
              <a
                href={`${ABOUT_LINK.href}?scrollTo=${CONTACT_FORM_ID}`}
                className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors'
              >
                <Mail className='h-4 w-4' />
                Start a conversation
              </a>
              <a
                href={PROJECTS_LINK.href}
                className='inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-surface-tertiary transition-colors'
              >
                <ArrowUpRight className='h-4 w-4' />
                View my work
              </a>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
