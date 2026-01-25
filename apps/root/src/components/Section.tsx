import { Section as UISection } from '@danieljoffe.com/ui';
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
    <UISection
      center={true}
      overflow='hidden'
      fullWidth={true}
      className={`min-h-min max-h-max ${className ?? ''}`}
      aria-labelledby={ariaLabelBy}
    >
      {children}
    </UISection>
  );
}
