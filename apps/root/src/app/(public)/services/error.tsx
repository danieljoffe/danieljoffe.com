'use client';

import RouteError from '@/components/RouteError';

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      route='/services'
      description='There was an error loading the services page. Please try again.'
    />
  );
}
