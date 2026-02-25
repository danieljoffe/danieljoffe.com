import type { Decorator, Preview } from '@storybook/react-vite';

import '../src/styles/preview.scss';

// Syncs the background toggle with Tailwind's .dark class
// Without this, the canvas color changes but components stay in light mode
const withThemeClass: Decorator = (Story, context) => {
  const background = context.globals.backgrounds?.value;
  const isDark = background === '#1c1917';

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return Story();
};

const preview: Preview = {
  decorators: [withThemeClass],

  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      options: {
        dark: { name: 'Dark', value: '#1c1917' },
        light: { name: 'Light', value: '#fdfbf7' },
      },
    },
    docs: {
      // Makes the docs background match the selected theme
      canvas: {
        sourceState: 'shown',
      },
    },
  },

  initialGlobals: {
    backgrounds: {
      value: '#1c1917',
    },
  },
};

export default preview;
