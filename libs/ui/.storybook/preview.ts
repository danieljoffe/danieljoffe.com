import type { Preview } from '@storybook/react-vite';

import '../src/styles/tailwind.scss';
import '../src/styles/theme.muted-violet.scss';
import '../src/styles/theme.muted-violet-dark.scss';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0f' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
