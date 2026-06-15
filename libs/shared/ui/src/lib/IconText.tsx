import {
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from './utils';

export type IconTextPosition = 'left' | 'right';

export interface IconTextProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children'
> {
  ref?: Ref<HTMLElement> | undefined;
  /** Icon node rendered alongside the text. Consumers pass their own icon (e.g. lucide-react). */
  icon: ReactNode;
  /** Which side of the text the icon sits on. */
  iconPosition?: IconTextPosition;
  children: ReactNode;
  className?: string;
  /** Element type for the container. Defaults to `span`. */
  as?: ElementType;
}

/**
 * Aligns an icon with adjacent text so the icon optically centers on the text.
 *
 * Containers that use plain `items-center` center the icon's *box* against the
 * text *line-box*; with a tall line-height the icon lands a few px too low. This
 * component collapses the text line-box with `leading-none` so `items-center`
 * centers the icon on the glyph, and wraps the icon in a `shrink-0 inline-flex`
 * so it never squishes. No `mt-*` nudges required.
 *
 * Pure presentational component — React 19 ref-as-prop, no `forwardRef`,
 * no `'use client'`, no framework dependencies.
 */
export function IconText({
  icon,
  iconPosition = 'left',
  children,
  className,
  as,
  ref,
  ...props
}: IconTextProps) {
  const Component = as ?? 'span';
  const iconNode = (
    <span className='inline-flex shrink-0' aria-hidden='true'>
      {icon}
    </span>
  );

  return (
    <Component
      ref={ref}
      className={cn(
        // `leading-none` collapses the container line-box so `items-center`
        // optically centers the icon on the text glyph. `[&>*]:my-0` strips
        // block margins from text children (e.g. a `Heading`/`<p>` whose UA or
        // global stylesheet adds a bottom margin) — that asymmetric margin
        // would otherwise re-introduce the few-px misalignment this component
        // exists to fix.
        'inline-flex items-center gap-x-2 leading-none [&>*]:my-0',
        className
      )}
      {...props}
    >
      {iconPosition === 'left' && iconNode}
      {children}
      {iconPosition === 'right' && iconNode}
    </Component>
  );
}
