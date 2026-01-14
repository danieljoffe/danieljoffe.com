export const baseStyles = [
  'flex w-full rounded-md border px-4',
  'py-2 text-sm transition focus:outline-none',
  'focus:ring-2 font-mono min-h-min',
  'border-2',
].join(' ');

export const textAreaBaseStyles = baseStyles.replace(
  'min-h-min',
  'min-h-[7.5rem] max-h-[15rem]'
);

export const stateStyles = {
  default:
    'border-neutral-300 bg-neutral-100 focus:border-blue-500 focus:ring-blue-400',
  error:
    'border-rose-500 bg-neutral-100 placeholder-rose-400 focus:border-rose-500 focus:ring-rose-400 aria-invalid',
  success:
    'border-blue-500 bg-neutral-100 placeholder-blue-400 focus:border-blue-500 focus:ring-blue-400 aria-valid',
  disabled:
    'border-neutral-200 bg-neutral-100 text-neutral-400 placeholder-neutral-300 cursor-not-allowed',
};
