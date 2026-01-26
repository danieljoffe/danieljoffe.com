import {
  ButtonSize,
  ButtonStateInterface,
  ButtonVariant,
} from './button.types';

// Uses UI library semantic color tokens for consistent theming
export const buttonBaseStyles = [
  'flex inline-flex items-center justify-center',
  'border-transparent rounded-md',
  'transition-all duration-200 ease-in-out',
  'focus:outline-none focus:ring-2',
  'focus:ring-offset-2 focus:ring-offset-background border-2',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

export const buttonVariantStyles: Record<ButtonVariant, string> = {
  default: 'bg-transparent',
  primary: [
    'bg-accent text-accent-foreground',
    'hover:bg-accent-hover active:bg-accent-active',
    'focus:ring-accent',
  ].join(' '),
  secondary: [
    'bg-background-elevated border-border text-foreground',
    'hover:border-border-strong hover:bg-border-strong',
    'active:bg-background-alt',
    'focus:ring-accent',
  ].join(' '),
  icon: [
    'border-border p-2 rounded-full',
    'hover:border-border-strong active:bg-background-elevated',
    'focus:ring-accent',
    'p-2 w-10 h-10 min-w-[1.25rem]',
  ].join(' '),
  link: [
    'hover:text-accent hover:underline hover:underline-offset-4',
    'active:text-accent-active',
  ].join(' '),
};

export const buttonStateStyles: Record<keyof ButtonStateInterface, string> = {
  enabled: 'cursor-pointer hover:cursor-pointer',
  disabled: 'cursor-not-allowed opacity-50 hover:cursor-not-allowed',
  highlighted: '',
};

export const buttonLinkStyles: Record<keyof ButtonStateInterface, string> = {
  ...buttonStateStyles,
  highlighted: 'text-accent underline underline-offset-4',
};

export const buttonSizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base p-2 h-min-8',
  lg: 'text-lg p-3 h-min-10',
};
