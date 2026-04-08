import { Monitor, Smartphone } from 'lucide-react';
import type { DeviceMode } from '@danieljoffe.com/shared-audit';
import Button from '@/components/Button';

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
        <Button
          key={tab.label}
          as='link'
          href={tab.href}
          variant={tab.active ? 'primary' : 'ghost'}
          aria-current={tab.active ? 'page' : undefined}
        >
          {tab.icon}
          {tab.label}
        </Button>
      ))}
    </nav>
  );
}
