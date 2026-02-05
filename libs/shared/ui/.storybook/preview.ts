import type { Preview } from '@storybook/react-vite';

import '../src/styles/preview.scss';

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        dark: { name: 'dark', value: '#0a0a0f' },
        light: { name: 'light', value: '#ffffff' },
      },
    },
  },

  initialGlobals: {
    backgrounds: {
      value: 'dark',
    },
  },
};

export default preview;
