'use client';

import RouteError from '@/components/RouteError';

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      route='/blog/[slug]'
      description='There was an error loading this blog post. Please try again.'
    />
  );
}
