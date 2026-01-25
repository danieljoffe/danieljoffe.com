import { Container as UIContainer } from '@danieljoffe.com/ui';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({
  children,
  className = '',
}: ContainerProps) {
  return (
    <div
      className={`flex justify-center ${className}`}
      data-testid='container-outer'
    >
      <UIContainer
        size='sm'
        className='flex flex-col py-8 md:py-14'
        data-testid='container-inner'
      >
        {children}
      </UIContainer>
    </div>
  );
}
