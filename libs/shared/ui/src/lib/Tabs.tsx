'use client';

import {
  useState,
  useId,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { cn } from './utils';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  ref?: Ref<HTMLDivElement> | undefined;
  tabs: Tab[];
  defaultTab?: string | undefined;
  onChange?: (tabId: string) => void;
  className?: string | undefined;
}

export function Tabs({
  tabs,
  defaultTab,
  onChange,
  className,
  ref,
}: TabsProps) {
  const firstTab = tabs[0];
  const [activeTab, setActiveTab] = useState(defaultTab ?? firstTab?.id ?? '');
  const baseId = useId();

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onChange?.(tabId);
    },
    [onChange]
  );

  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;
  const getTabId = useCallback(
    (tabId: string) => `${baseId}-tab-${tabId}`,
    [baseId]
  );
  const getPanelId = useCallback(
    (tabId: string) => `${baseId}-panel-${tabId}`,
    [baseId]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, tabId: string) => {
      const currentIndex = tabs.findIndex(t => t.id === tabId);
      let newIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
          newIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = tabs.length - 1;
          break;
      }

      if (newIndex !== null) {
        const newTab = tabs[newIndex];
        if (!newTab) return;
        e.preventDefault();
        handleTabChange(newTab.id);
        document.getElementById(getTabId(newTab.id))?.focus();
      }
    },
    [tabs, handleTabChange, getTabId]
  );

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className={cn('w-full', className)}>
      <div className='border-b border-border'>
        <div role='tablist' className='flex gap-1 flex-wrap'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={getTabId(tab.id)}
              role='tab'
              aria-selected={activeTab === tab.id}
              aria-controls={getPanelId(tab.id)}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={e => handleKeyDown(e, tab.id)}
              className={cn(
                'px-4 py-2.5 border-b-2 transition-colors focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-500'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div
        id={getPanelId(activeTab)}
        role='tabpanel'
        tabIndex={0}
        aria-labelledby={getTabId(activeTab)}
        className='mt-4'
      >
        {activeContent}
      </div>
    </div>
  );
}
