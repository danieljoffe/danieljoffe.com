import type { Metadata } from 'next';
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
import { CTACard } from '@danieljoffe.com/shared-ui/CTACard';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { SectionLabel } from '@danieljoffe.com/shared-ui/SectionLabel';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { cn } from '@/lib/cn';
import { cardBase } from '@/lib/layoutStyles';
import { aboutMetadata } from '@/data/metadata/about';
import { expertiseCategories } from '@/data/about';
import { experienceFull, experiencePageSlugs } from '@/data/experience';
import { FULL_NAME, JOB_TITLE, EXPERIENCE_LINK } from '@/utils/constants';
import { CompanyLogo } from '@/components/kit';
import Button from '@/components/Button';
import SocialLinks from './SocialLinks';
import ContactForm from './ContactForm';

export const metadata: Metadata = aboutMetadata;

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

export default function About() {
  return (
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section padding='none'>
        <div className='relative space-y-6'>
          <div className='flex flex-col gap-x-5 gap-y-12'>
            <Heading variant='hero' className='text-center md:text-left'>
              Building Without Friction
            </Heading>

            <div className='flex flex-col sm:flex-row gap-8 items-center'>
              <Image
                src='/images/daniel-joffe-profile.webp'
                alt={FULL_NAME}
                title={FULL_NAME}
                width={200}
                height={200}
                className='rounded-full size-40 object-cover border border-border self-center sm:self-start shrink-0'
                sizes='200px'
                priority
                decoding='async'
              />
              <div className='space-y-4 text-center sm:text-left'>
                <Heading as='h2' variant='section'>
                  {FULL_NAME}
                </Heading>
                <Text as='p' variant='subtitle'>
                  {JOB_TITLE}
                </Text>
                <SocialLinks />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <SectionLabel icon={<User className='h-3.5 w-3.5' />} label='About' />
        <div className='space-y-6'>
          <Text variant='bodyLg'>
            I specialize in building fast, accessible interfaces and scalable
            design systems that empower teams and delight users.
          </Text>
          <Text variant='bodyLg'>
            For over 10 years, I&apos;ve focused on one thing: removing
            friction. Simplifying complex systems, streamlining workflows, and
            helping teams turn whiteboard ideas into real-world solutions,
            faster, with less effort.
          </Text>
          <Text variant='bodyLg'>
            Explore my journey below, and let&apos;s discuss how I can help your
            team.
          </Text>
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
            <div key={category.label} className={cn(cardBase, 'p-4')}>
              <Heading variant='cardTitle' as='p' className='mb-3'>
                {category.label}
              </Heading>
              <div className='flex flex-wrap gap-1.5'>
                {category.skills.map(tag => {
                  const slug = encodeURIComponent(
                    tag.toLowerCase().replace(/\s+/g, '-')
                  );
                  return (
                    <Button
                      key={tag}
                      href={`/blog/tags/${slug}`}
                      as='link'
                      variant='outline'
                      size='sm'
                    >
                      {tag}
                    </Button>
                  );
                })}
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
          <Text variant='bodyLg'>
            My journey began in frontend development, but I&apos;ve grown into a
            full-stack engineer and technical leader who bridges the gap between
            engineering and business teams.
          </Text>

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
                    <Heading variant='cardTitle' as='p'>
                      {company.company}
                    </Heading>
                    <Text variant='detail' className='mt-0.5'>
                      {company.role}
                    </Text>
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
          <Text variant='bodyLg'>
            I thrive at the intersection of technical and business teams:
            simplifying complex systems, removing friction, and investing in the
            people around me. When teams succeed, products succeed.
          </Text>

          <div className='space-y-1'>
            {mantraItems.map(({ company, description, icon: Icon }, i) => (
              <div key={company} className='group relative pl-8 pb-6 last:pb-0'>
                {i < mantraItems.length - 1 && (
                  <div className='absolute left-2.75 top-3 bottom-0 w-px bg-border' />
                )}
                <div
                  className={cn(
                    'absolute left-0 top-1.5 h-5.5 w-5.5 rounded-full border-2 flex items-center justify-center',
                    i === mantraItems.length - 1
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-border bg-surface'
                  )}
                >
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      i === mantraItems.length - 1
                        ? 'bg-brand-500'
                        : 'bg-border-secondary'
                    )}
                  />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <Icon className='h-4 w-4 text-brand-500' />
                    <Heading variant='cardTitle' as='p'>
                      {company}
                    </Heading>
                  </div>
                  <Text variant='body' className='mt-1'>
                    {description}
                  </Text>
                </div>
              </div>
            ))}
          </div>

          <Text variant='bodyLg'>
            What&apos;s remained constant is my focus on removing bottlenecks,
            empowering teams, and driving measurable business impact through
            thoughtful technical solutions.
          </Text>
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
          <Text variant='meta' as='p'>
            <span className='font-semibold'>Response time:</span> Usually within
            24 hours
          </Text>
          <ContactForm />
        </CTACard>
      </Section>
    </PageLayout>
  );
}
