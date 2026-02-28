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
      className='flex justify-center gap-1 py-2 bg-background-alt'
    >
      {tabs.map(tab => (
        <a
          key={tab.label}
          href={tab.href}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab.active
              ? 'bg-foreground text-background'
              : 'text-foreground-muted hover:text-foreground hover:bg-background'
          }`}
          aria-current={tab.active ? 'page' : undefined}
        >
          {tab.icon}
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
