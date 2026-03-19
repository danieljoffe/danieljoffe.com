import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  Code2,
  Briefcase,
  Heart,
  MessageCircle,
  Rocket,
  Handshake,
  BookOpen,
  Cog,
  TrendingUp,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { expertiseCategories } from '@/data/about';
import { experienceFull, experiencePageSlugs } from '@/data/experience';
import { FULL_NAME, JOB_TITLE, EXPERIENCE_LINK } from '@/utils/constants';
import {
  Section,
  SectionLabel,
  PageLayout,
  CTACard,
  CompanyLogo,
} from '@/components/kit';
import SocialLinks from './SocialLinks';
import ContactForm from './ContactForm';

/* ─── Mantra items ─── */
const mantraItems: {
  company: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    company: 'Winc',
    description: 'Marketing velocity and brand transformation',
    icon: Rocket,
  },
  {
    company: 'Internet Brands',
    description: 'Team leadership and regulatory compliance',
    icon: Handshake,
  },
  {
    company: 'Library Corporation',
    description: 'Domain specialization and accessibility',
    icon: BookOpen,
  },
  {
    company: 'FightCamp',
    description: 'Infrastructure scaling and team empowerment',
    icon: Cog,
  },
  {
    company: 'Current',
    description: 'Foundation building and strategic growth',
    icon: TrendingUp,
  },
];

/* ════════════════════════════════════════════════
   ABOUT PAGE COPY
   ════════════════════════════════════════════════ */
export default function AboutCopy() {
  return (
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel icon={<User className='h-3.5 w-3.5' />} label='About' />
        <div className='space-y-6'>
          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            Building Without Friction
          </h1>

          <div className='flex flex-col sm:flex-row gap-6 sm:gap-8'>
            <Image
              src='/images/daniel-joffe-profile.png'
              alt={FULL_NAME}
              title={FULL_NAME}
              width={200}
              height={200}
              className='rounded-full size-[10rem] object-cover border border-border self-center sm:self-start shrink-0'
              sizes='200px'
              fetchPriority='high'
              decoding='async'
              loading='eager'
            />
            <div className='space-y-4 text-center sm:text-left'>
              <p className='text-sm font-semibold uppercase tracking-wider text-text-secondary'>
                {FULL_NAME}
                <br />
                <span className='text-text-tertiary'>{JOB_TITLE}</span>
              </p>
              <p className='text-base text-text-secondary leading-relaxed'>
                I specialize in building fast, accessible interfaces and
                scalable design systems that empower teams and delight users.
              </p>
              <p className='text-base text-text-secondary leading-relaxed'>
                For over 8 years, I&apos;ve focused on one thing: removing
                friction. Simplifying complex systems, streamlining workflows,
                and helping teams turn whiteboard ideas into real-world
                solutions, faster, with less effort.
              </p>
              <p className='text-base text-text-secondary leading-relaxed'>
                Explore my journey below, and let&apos;s discuss how I can help
                your team.
              </p>
              <SocialLinks />
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════
          TECHNICAL EXPERTISE
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Code2 className='h-3.5 w-3.5' />}
          label='Technical Expertise'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {expertiseCategories.map(category => (
            <div
              key={category.label}
              className='p-4 bg-surface-secondary rounded-xl border border-border'
            >
              <p className='text-sm font-semibold text-text-primary mb-3'>
                {category.label}
              </p>
              <div className='flex flex-wrap gap-1.5'>
                {category.skills.map(skill => (
                  <span
                    key={skill}
                    className='inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-medium'
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          CAREER TIMELINE
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Briefcase className='h-3.5 w-3.5' />}
          label='Career Timeline'
        />
        <div className='space-y-6'>
          <p className='text-base text-text-secondary leading-relaxed'>
            My journey began in frontend development, but I&apos;ve evolved into
            a technical leader who bridges the gap between engineering and
            business teams.
          </p>

          {/* Timeline images */}
          <div className='flex md:hidden w-full'>
            <Image
              src='/images/sm-timeline-light.svg'
              alt='Career timeline overview'
              width={375}
              height={667}
              className='w-full dark:hidden rounded-2xl border border-border'
              sizes='100vw'
              unoptimized
              loading='lazy'
              decoding='async'
            />
            <Image
              src='/images/sm-timeline.svg'
              alt='Career timeline overview'
              width={375}
              height={667}
              className='w-full hidden dark:block rounded-2xl border border-border'
              sizes='100vw'
              unoptimized
              loading='lazy'
              decoding='async'
            />
          </div>
          <div className='hidden md:flex w-full'>
            <Image
              src='/images/md-timeline-light.svg'
              alt='Career timeline overview'
              height={768}
              width={1024}
              className='w-full dark:hidden rounded-2xl border border-border'
              sizes='(min-width: 768px) 50vw, (min-width: 1024px) 33vw'
              unoptimized
              loading='lazy'
              decoding='async'
            />
            <Image
              src='/images/md-timeline.svg'
              alt='Career timeline overview'
              height={768}
              width={1024}
              className='w-full hidden dark:block rounded-2xl border border-border'
              sizes='(min-width: 768px) 50vw, (min-width: 1024px) 33vw'
              unoptimized
              loading='lazy'
              decoding='async'
            />
          </div>

          {/* Experience cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {experiencePageSlugs.map(slug => {
              const company = experienceFull[slug];
              if (!company) return null;
              return (
                <Link
                  key={company.slug}
                  href={`${EXPERIENCE_LINK.href}/${company.slug}`}
                  className='group flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-surface-secondary transition-colors'
                >
                  <CompanyLogo
                    src={company.logo}
                    alt={company.company}
                    size='lg'
                  />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-semibold text-text-primary'>
                      {company.company}
                    </p>
                    <p className='text-xs text-text-secondary mt-0.5'>
                      {company.role}
                    </p>
                  </div>
                  <ChevronRight className='h-4 w-4 text-text-tertiary group-hover:text-text-primary transition-colors shrink-0' />
                </Link>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════
          MANTRA / EVOLUTION
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel icon={<Heart className='h-3.5 w-3.5' />} label='Mantra' />
        <div className='space-y-6'>
          <p className='text-base text-text-secondary leading-relaxed'>
            I thrive at the intersection of technical and business teams —
            simplifying complex systems, removing friction, and investing in the
            people around me. When teams succeed, products succeed.
          </p>

          <div className='space-y-1'>
            {mantraItems.map(({ company, description, icon: Icon }, i) => (
              <div key={company} className='group relative pl-8 pb-6 last:pb-0'>
                {i < mantraItems.length - 1 && (
                  <div className='absolute left-[11px] top-3 bottom-0 w-px bg-border' />
                )}
                <div
                  className={[
                    'absolute left-0 top-1.5 h-[22px] w-[22px] rounded-full border-2 flex items-center justify-center',
                    i === mantraItems.length - 1
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-border bg-surface',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'h-2 w-2 rounded-full',
                      i === mantraItems.length - 1
                        ? 'bg-brand-500'
                        : 'bg-border-secondary',
                    ].join(' ')}
                  />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <Icon className='h-4 w-4 text-brand-500' />
                    <p className='text-sm font-semibold text-text-primary'>
                      {company}
                    </p>
                  </div>
                  <p className='text-sm text-text-secondary mt-1 leading-relaxed'>
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className='text-base text-text-secondary leading-relaxed'>
            What&apos;s remained constant is my focus on removing bottlenecks,
            empowering teams, and driving measurable business impact through
            thoughtful technical solutions.
          </p>
        </div>
      </Section>

      {/* ══════════════════════════════════
          CONTACT
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<MessageCircle className='h-3.5 w-3.5' />}
          label="Let's Connect"
        />
        <CTACard
          heading="Let's Connect"
          description={
            <>
              Available for contract work, consulting, and fractional
              engineering engagements. Have a project in mind? I&apos;d love to
              hear about it.
            </>
          }
        >
          <p className='text-xs text-text-tertiary'>
            <span className='font-semibold'>Response time:</span> Usually within
            24 hours
          </p>
          <ContactForm />
        </CTACard>
      </Section>
    </PageLayout>
  );
}
