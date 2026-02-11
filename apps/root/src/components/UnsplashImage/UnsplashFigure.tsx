import { ReactNode } from 'react';

interface UnsplashFigureProps {
  width?: number;
  height?: number;
  children: ReactNode;
}

export default function UnsplashFigure({
  width,
  height,
  children,
}: UnsplashFigureProps) {
  return (
    <figure
      className='flex relative'
      style={{ aspectRatio: width && height ? `${width}/${height}` : '9/16' }}
    >
      {children}
    </figure>
  );
}
