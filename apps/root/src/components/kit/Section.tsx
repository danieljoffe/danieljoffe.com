import { Section as SharedSection } from '@danieljoffe.com/shared-ui/Section';

export function Section({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SharedSection
      padding='none'
      background='none'
      overflow='visible'
      className={`px-6 lg:px-0 ${className}`}
    >
      {children}
    </SharedSection>
  );
}
