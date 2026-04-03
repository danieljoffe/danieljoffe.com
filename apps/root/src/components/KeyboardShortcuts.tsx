'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { HOME_LINK } from '@/utils/constants';

export default function KeyboardShortcuts() {
  const router = useRouter();

  const goHome = useCallback(() => {
    router.push(HOME_LINK.href);
  }, [router]);

  useKeyboardShortcut('h', goHome);

  return null;
}
