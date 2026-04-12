import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';

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

    options: {
      storySort: {
        order: ['Introduction', '*'],
      },
    },

    a11y: {
      test: 'error',
      config: {
        rules: [{ id: 'aria-hidden-body', enabled: false }],
      },
    },
  },
};

export default preview;
