import {
  ButtonSize,
  ButtonStateInterface,
  ButtonVariant,
} from './button.types';

export const buttonBaseStyles = [
  'flex inline-flex items-center justify-center',
  'font-sans font-bold border-transparent rounded',
  'transition-colors duration-400 ease-in-out',
  'focus:outline-none focus-visible:ring-2',
  'focus-visible:ring-offset-2 border-2',
  'disabled:bg-neutral-100 disabled:text-neutral-500 disabled:border-neutral-200',
].join(' ');

export const buttonVariantStyles: Record<ButtonVariant, string> = {
  default: 'bg-transparent',
  primary: [
    'bg-blue-500 text-white',
    'hover:bg-blue-600 active:border-blue-900',
    'focus-visible:ring-blue-500 ',
  ].join(' '),
  secondary: [
    'bg-neutral-100 border-neutral-200 text-neutral-900',
    'hover:border-neutral-600',
    'active:bg-neutral-200 active:border-neutral-600',
    'focus-visible:ring-neutral-600',
  ].join(' '),
  icon: [
    'border-neutral-100 p-2 rounded-full',
    'hover:border-neutral-200 active:border-neutral-400',
    'focus-visible:ring-neutral-200',
    'p-2 w-10 h-10 min-w-[1.25rem]',
  ].join(' '),
  link: [
    'hover:text-blue-600 hover:underline hover:underline-offset-4',
    'active:text-blue-700',
  ].join(' '),
};

export const buttonStateStyles: Record<keyof ButtonStateInterface, string> = {
  enabled: 'cursor-pointer hover:cursor-pointer',
  disabled: 'cursor-not-allowed opacity-60 hover:cursor-not-allowed',
  highlighted: '',
};

export const buttonLinkStyles: Record<keyof ButtonStateInterface, string> = {
  ...buttonStateStyles,
  highlighted: 'text-blue-500 underline underline-offset-4',
};

export const buttonSizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base p-2 h-min-8',
  lg: 'text-lg p-3 h-min-10',
};
