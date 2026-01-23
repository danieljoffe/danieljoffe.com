import React, { useState, useId } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export function Tabs({ tabs, defaultTab, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const baseId = useId();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;
  const getTabId = (tabId: string) => `${baseId}-tab-${tabId}`;
  const getPanelId = (tabId: string) => `${baseId}-panel-${tabId}`;

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
        tabIndex={0}
        className='mt-4'
      >
        {activeContent}
      </div>
    </div>
  );
}
