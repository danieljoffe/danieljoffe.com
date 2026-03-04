'use client';

import { useEffect, useState } from 'react';

export default function TestingOnly() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Mark hydration complete for e2e tests
  // This element serves as a hydration checkpoint in Playwright tests
  return <div data-hydrated={hasHydrated && 'true'} hidden />;
}
