import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

const theme = create({
  base: 'dark',

  // Brand
  brandTitle: 'danieljoffe/ui',
  brandUrl: 'https://danieljoffe.com',
  brandTarget: '_blank',
  brandImage: 'https://danieljoffe.com/logo.svg',

  // UI chrome — matches .dark token values from theme.css
  colorPrimary: '#006fd7', // brand-500: oklch(0.54 0.19 250)
  colorSecondary: '#006fd7', // brand-500

  // App background
  appBg: '#0f1117', // --surface (dark)
  appContentBg: '#161922', // --surface-secondary (dark)
  appPreviewBg: '#0f1117', // --surface (dark)
  appBorderColor: '#2a2d3a', // --border (dark)
  appBorderRadius: 4, // --radius-xs

  // Text
  textColor: '#f1f5f9', // --text-primary (dark)
  textMutedColor: '#94a3b8', // --text-secondary (dark)
  textInverseColor: '#0f1117', // --text-inverse (dark)

  // Toolbar
  barTextColor: '#94a3b8', // --text-secondary (dark)
  barHoverColor: '#f1f5f9', // --text-primary (dark)
  barSelectedColor: '#006fd7', // brand-500
  barBg: '#161922', // --surface-secondary (dark)

  // Inputs
  inputBg: '#1a1d2b', // --surface-elevated (dark)
  inputBorder: '#3a3d4a', // --border-secondary (dark)
  inputTextColor: '#f1f5f9', // --text-primary (dark)
  inputBorderRadius: 4,
});

addons.setConfig({
  theme,
});
