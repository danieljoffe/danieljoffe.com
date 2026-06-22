import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  Code2,
  Briefcase,
  Heart,
  MessageCircle,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Badge } from '@danieljoffe/shared-ui/Badge';
import { CTACard } from '@danieljoffe/shared-ui/CTACard';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';
import { SectionLabel } from '@danieljoffe/shared-ui/SectionLabel';
import { Text } from '@danieljoffe/shared-ui/Text';
import { cn } from '@/lib/cn';
import { cardBase } from '@/lib/layoutStyles';
import { aboutMetadata } from '@/data/metadata/about';
import { expertiseCategories } from '@/data/about';
import { experiencePageSlugs } from '@/data/experience';
import { getContentBySlug } from '@/data/contentRegistry';
import { getContentByTag, tagToSlug } from '@/lib/tags';
import { AllowedExperienceSlugs } from '@/types/base';
import {
  FULL_NAME,
  JOB_TITLE,
  EXPERIENCE_LINK,
  RESUME_LINK,
} from '@/utils/constants';
import { CompanyLogo } from '@/components/kit';
import Button from '@/components/Button';
import SocialLinks from './SocialLinks';
import ContactForm from './ContactForm';

export const metadata: Metadata = aboutMetadata;

/* ─── Guiding values ─── */
const values: { title: string; description: string }[] = [
  {
    title: 'Autonomy over dependency.',
    description:
      'The best thing I can build for your team is the ability to ship without me.',
  },
  {
    title: 'Proof over promises.',
    description:
      'I measure outcomes: load times, adoption rates, engineering hours saved. Not effort.',
  },
  {
    title: 'Systems over heroics.',
    description:
      'Good architecture means nobody needs to be a hero. I build the foundations that make everyone faster.',
  },
];

export default function About() {
  return (
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section padding='none' className='py-8 md:py-12'>
        <div className='relative space-y-6'>
          <div className='flex flex-col gap-x-5 gap-y-12'>
            <Heading variant='hero' className='text-center md:text-left'>
              The engineer behind the systems
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
                <div className='flex justify-center sm:justify-start'>
                  <Button
                    as='link'
                    href={RESUME_LINK.href}
                    variant='outline'
                    size='sm'
                  >
                    <FileText className='h-4 w-4' />
                    View résumé
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section padding='none'>
        <SectionLabel icon={<User className='h-3.5 w-3.5' />} label='About' />
        <div className='space-y-6'>
          <Text variant='bodyLg'>
            Most frontend engineers write components. I build the systems that
            make hundreds of components work together: design systems adopted
            across organizations, CMS tooling that takes marketing teams off the
            engineering backlog, performance overhauls that cut load times by
            80%.
          </Text>
          <Text variant='bodyLg'>
            I&apos;ve been doing this for over a decade, across startups (Winc,
            FightCamp), enterprise (Internet Brands), and specialized
            environments (The Library Corporation). The common thread: every
            role left the team faster and more autonomous than I found them.
          </Text>
          <Text variant='bodyLg'>
            Below is the full picture: the tools I use, the companies I&apos;ve
            worked with, and the philosophy that ties it all together.
          </Text>
        </div>
      </Section>

      {/* ══════════════════════════════════
          CAREER TIMELINE
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Briefcase className='h-3.5 w-3.5' />}
          label='Career Timeline'
        />
        <div className='space-y-6'>
          <Text variant='bodyLg'>
            I started in frontend development and grew into a full-stack
            engineer and technical lead, comfortable sitting between the
            engineering and business sides and keeping both moving.
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
              const entry = getContentBySlug(
                'experience',
                slug as AllowedExperienceSlugs
              );
              if (!entry) return null;
              const { company, role, logo } = entry.metadata;
              if (!company || !logo) return null;
              return (
                <Link
                  key={slug}
                  href={`${EXPERIENCE_LINK.href}/${slug}`}
                  className='group flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-surface-secondary transition-colors'
                >
                  <CompanyLogo src={logo} alt={company} size='lg' />
                  <div className='flex-1 min-w-0'>
                    <Heading variant='cardTitle'>{company}</Heading>
                    <Text variant='detail' className='mt-0.5'>
                      {role}
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
          TECHNICAL EXPERTISE
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Code2 className='h-3.5 w-3.5' />}
          label='Technical Expertise'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {expertiseCategories.map(category => (
            <div key={category.label} className={cn(cardBase, 'p-4')}>
              <Heading variant='cardTitle' className='mb-1'>
                {category.label}
              </Heading>
              <Text variant='body' className='mb-3'>
                {category.description}
              </Text>
              <div className='flex flex-wrap gap-1.5'>
                {category.skills.map(tag => {
                  const slug = tagToSlug(tag);
                  const hasContent = getContentByTag(tag).length > 0;
                  if (!hasContent) {
                    return (
                      <Badge
                        key={tag}
                        variant='default'
                        size='md'
                        className='font-normal'
                      >
                        {tag}
                      </Badge>
                    );
                  }
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
          WHAT I VALUE
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Heart className='h-3.5 w-3.5' />}
          label='What I Value'
        />
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {values.map(value => (
            <div key={value.title} className={cn(cardBase, 'p-4')}>
              <Heading variant='cardTitle' className='mb-2'>
                {value.title}
              </Heading>
              <Text variant='body'>{value.description}</Text>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          CONTACT
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<MessageCircle className='h-3.5 w-3.5' />}
          label="Let's Connect"
        />
        <CTACard
          heading="Let's figure out if I'm the right fit."
          description={
            <>
              Tell me about the role or the team. I respond within 24 hours, and
              I&apos;ll be straight about whether it&apos;s a fit.
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
