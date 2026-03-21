'use client';

import RouteError from '@/components/RouteError';

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      route='/projects/[slug]'
      description='There was an error loading this project page. Please try again.'
    />
  );
}
