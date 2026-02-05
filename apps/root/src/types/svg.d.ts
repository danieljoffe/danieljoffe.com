declare module '*.svg' {
  import type { FC, SVGProps } from 'react';

  const content: string;
  export const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default content;
}
