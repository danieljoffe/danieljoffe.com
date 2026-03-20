'use client';

import RouteError from '@/components/RouteError';

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      route='/audit/admin'
      description='There was an error loading the admin dashboard. Please try again.'
    />
  );
}
