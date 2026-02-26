import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';

import '../src/styles/preview.scss';

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'dark',
    }),
  ],

  parameters: {
    layout: 'fullscreen',

    docs: {
      canvas: {
        sourceState: 'shown',
      },
    },

    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
