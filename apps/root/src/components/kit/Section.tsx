export function Section({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative px-6 lg:px-0 ${className}`}>
      {children}
    </section>
  );
}
