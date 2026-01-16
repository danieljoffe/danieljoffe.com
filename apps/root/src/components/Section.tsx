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
      className={`w-full flex justify-center ${className}`}
      aria-labelledby={ariaLabelBy}
    >
      {children}
    </section>
  );
}
