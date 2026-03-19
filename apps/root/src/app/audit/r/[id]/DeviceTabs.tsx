import Link from 'next/link';
import { Monitor, Smartphone } from 'lucide-react';
import type { DeviceMode } from '@danieljoffe.com/shared-audit';

interface DeviceTabsProps {
  currentDevice: DeviceMode;
  currentScanId: string;
  pairedScanId: string | null;
}

export default function DeviceTabs({
  currentDevice,
  currentScanId,
  pairedScanId,
}: DeviceTabsProps) {
  if (!pairedScanId) return null;

  const mobileId = currentDevice === 'mobile' ? currentScanId : pairedScanId;
  const desktopId = currentDevice === 'desktop' ? currentScanId : pairedScanId;

  const tabs = [
    {
      label: 'Mobile',
      href: `/audit/r/${mobileId}`,
      icon: <Smartphone className='size-4' aria-hidden='true' />,
      active: currentDevice === 'mobile',
    },
    {
      label: 'Desktop',
      href: `/audit/r/${desktopId}`,
      icon: <Monitor className='size-4' aria-hidden='true' />,
      active: currentDevice === 'desktop',
    },
  ];

  return (
    <nav
      aria-label='Device view'
      className='flex justify-center gap-1 py-2 bg-surface-secondary'
    >
      {tabs.map(tab => (
        <Link
          key={tab.label}
          href={tab.href}
          className={`inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface px-4 py-3 ${
            tab.active
              ? 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700'
              : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
          }`}
          aria-current={tab.active ? 'page' : undefined}
        >
          {tab.icon}
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
