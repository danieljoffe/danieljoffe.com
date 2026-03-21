import { headers } from 'next/headers';

export default async function Head() {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;

  return (
    <head>
      {/*
        Blocking script to apply dark mode class before paint.
        Prevents flash of wrong theme while React hydrates with server defaults.
        Must run before any rendering occurs.
        Requires nonce for CSP — headers() forces dynamic rendering,
        which is necessary for nonce-based CSP to work.
      */}
      <script
        suppressHydrationWarning
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
        }}
      />
      {/* Resource hints for third-party services */}
      <link rel='dns-prefetch' href='https://sentry.io' />
      <link rel='dns-prefetch' href='https://www.googletagmanager.com' />
      <link rel='dns-prefetch' href='https://www.google-analytics.com' />
      <link rel='dns-prefetch' href='https://hcaptcha.com' />
      <link rel='dns-prefetch' href='https://api.hcaptcha.com' />
      <link rel='prefetch' href='https://images.unsplash.com' />
      <link rel='prefetch' href='https://unsplash.com' />
    </head>
  );
}
