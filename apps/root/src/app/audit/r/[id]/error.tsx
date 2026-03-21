'use client';

import RouteError from '@/components/RouteError';

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      route='/audit/r/[id]'
      description='There was an error loading this report. Please try again.'
    />
  );
}
