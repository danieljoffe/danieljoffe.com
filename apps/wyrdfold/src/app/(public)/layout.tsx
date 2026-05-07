import type { ReactNode } from 'react';
import Link from 'next/link';
import { Github, Linkedin, Mail, type LucideIcon } from 'lucide-react';
import Button from '@/components/Button';
import WyrdfoldLogo from '@/components/WyrdfoldLogo';

interface SocialLink {
  label: string;
  href: string;
  icon: LucideIcon;
  external: boolean;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/danieljoffe',
    icon: Github,
    external: true,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/daniel-joffe-work',
    icon: Linkedin,
    external: true,
  },
  {
    label: 'Email',
    href: 'mailto:hello@danieljoffe.com',
    icon: Mail,
    external: false,
  },
];

const PORTFOLIO_URL = 'https://danieljoffe.com';

/**
 * Public marketing shell — no sidebar, no mobile nav, no auth required.
 * Auth gating for `/` (the only route currently in this group) is handled
 * upstream in proxy.ts, which redirects signed-in users to /dashboard.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  // The page is force-static, so this resolves at build time. Re-deploys
  // pick up the new year; not worth more than that.
  const year = new Date().getFullYear();

  return (
    <div className='min-h-screen flex flex-col bg-surface text-text-primary'>
      <header className='border-b border-border'>
        <div className='mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6 md:py-5'>
          <Link
            href='/'
            aria-label='WyrdFold home'
            className='flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
          >
            <WyrdfoldLogo aria-label='WyrdFold' className='h-5 w-6' />
            <span className='text-base font-semibold tracking-tight text-text-primary'>
              WyrdFold
            </span>
          </Link>
          <Button
            name='wyrdfold-public-header-sign-in'
            as='link'
            href='/login'
            variant='outline'
            size='sm'
          >
            Sign in
          </Button>
        </div>
      </header>
      <main id='main-content' className='flex-1'>
        {children}
      </main>
      <footer className='border-t border-border'>
        <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-text-tertiary md:flex-row md:items-center md:justify-between md:gap-6 md:px-6 md:py-10'>
          <p>
            Built by{' '}
            <a
              href={PORTFOLIO_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='rounded-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
            >
              Daniel Joffe
            </a>{' '}
            <span aria-hidden='true' className='mx-1 text-text-tertiary'>
              ·
            </span>{' '}
            © {year}
          </p>
          <ul className='flex flex-wrap items-center gap-x-5 gap-y-2'>
            {SOCIAL_LINKS.map(({ label, href, icon: Icon, external }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(external && {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  })}
                  className='inline-flex items-center gap-1.5 rounded-sm text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
                >
                  <Icon className='size-4' aria-hidden='true' />
                  <span>{label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
