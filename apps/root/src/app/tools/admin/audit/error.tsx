'use client';

import RouteError from '@/components/RouteError';

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      {...props}
      route='/tools/admin/audit'
      description='There was an error loading the admin dashboard. Please try again.'
    />
  );
}
