import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';
import { create } from 'storybook/theming/create';

import '../src/styles/preview.scss';
import '../src/styles/storybook-docs.css';

// Dark docs theme so the autodocs source-code blocks render light syntax
// tokens on a dark surface (the default light docs theme put dark tokens on a
// dark background, making code snippets unreadable). Values mirror manager.ts.
const docsTheme = create({
  base: 'dark',
  appBg: '#0f1117', // --surface (dark)
  appContentBg: '#161922', // --surface-secondary (dark)
  appBorderColor: '#2a2d3a', // --border (dark)
  textColor: '#f1f5f9', // --text-primary (dark)
  colorPrimary: '#006fd7', // brand-500
  colorSecondary: '#006fd7', // brand-500
  fontBase: 'ui-sans-serif, system-ui, sans-serif',
  fontCode: 'ui-monospace, monospace',
});

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
        pyre: 'pyre dark',
      },
      defaultTheme: 'dark',
    }),
  ],

  parameters: {
    layout: 'fullscreen',

    docs: {
      theme: docsTheme,
      canvas: {
        sourceState: 'shown',
      },
    },

    options: {
      storySort: {
        order: [
          'Introduction',
          'Guides',
          [
            "Extend, Don't Reimplement",
            'Reach for a Primitive',
            'Accessibility',
          ],
          '*',
        ],
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
