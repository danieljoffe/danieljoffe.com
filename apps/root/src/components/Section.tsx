import { WChildrenT } from '@/types/base';

interface SectionProps extends WChildrenT {
  className?: string;
  ariaLabelBy?: string;
}

export default function Section({
  children,
  className,
  ariaLabelBy,
}: SectionProps) {
  return (
    <section
      className={[
        'overflow-hidden min-h-min w-full flex justify-center',
        'max-h-max',
        className,
      ].join(' ')}
      aria-labelledby={ariaLabelBy}
    >
      {children}
    </section>
  );
}
