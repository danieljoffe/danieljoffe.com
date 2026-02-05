export default function Head() {
  return (
    <head>
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
