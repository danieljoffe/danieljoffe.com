'use client';

import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from './utils/cn';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface SidebarProps {
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  header?: ReactNode;
  footer?: ReactNode;
  collapsed?: boolean;
  className?: string;
}

function SidebarItemComponent({
  item,
  activeId,
  onSelect,
  collapsed,
  depth = 0,
}: {
  item: SidebarItem;
  activeId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  collapsed?: boolean | undefined;
  depth?: number | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = activeId === item.id;
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(item.id);
        }}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-150 cursor-pointer motion-reduce:transition-none',
          depth > 0 && 'ml-6 w-[calc(100%-1.5rem)]',
          isActive
            ? 'bg-brand-50 text-brand-700 font-medium'
            : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
        )}
      >
        {item.icon && <span className='h-4 w-4 shrink-0'>{item.icon}</span>}
        {!collapsed && (
          <>
            <span className='flex-1 text-left truncate'>{item.label}</span>
            {item.badge !== undefined && (
              <span className='text-xs px-1.5 py-0.5 rounded-full bg-surface-tertiary text-text-tertiary'>
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-text-tertiary transition-transform duration-200 motion-reduce:transition-none',
                  expanded && 'rotate-180'
                )}
              />
            )}
          </>
        )}
      </button>
      {hasChildren && expanded && !collapsed && (
        <div className='mt-0.5'>
          {item.children?.map(child => (
            <SidebarItemComponent
              key={child.id}
              item={child}
              activeId={activeId}
              onSelect={onSelect}
              collapsed={collapsed}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  items,
  activeId,
  onSelect,
  header,
  footer,
  collapsed = false,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-surface border-r border-border',
        'transition-all duration-200 motion-reduce:transition-none',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {header && (
        <div className='p-4 border-b border-border shrink-0'>{header}</div>
      )}
      <nav className='flex-1 overflow-y-auto p-2 space-y-0.5'>
        {items.map(item => (
          <SidebarItemComponent
            key={item.id}
            item={item}
            activeId={activeId}
            onSelect={onSelect}
            collapsed={collapsed}
          />
        ))}
      </nav>
      {footer && (
        <div className='p-4 border-t border-border shrink-0'>{footer}</div>
      )}
    </aside>
  );
}
