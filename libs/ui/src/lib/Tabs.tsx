'use client';

import { useState, useId, useCallback, type ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export function Tabs({ tabs, defaultTab, onChange }: TabsProps) {
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

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className='w-full'>
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
              className={`px-4 py-2.5 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border-strong'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div
        id={getPanelId(activeTab)}
        role='tabpanel'
        aria-labelledby={getTabId(activeTab)}
        className='mt-4'
      >
        {activeContent}
      </div>
    </div>
  );
}
