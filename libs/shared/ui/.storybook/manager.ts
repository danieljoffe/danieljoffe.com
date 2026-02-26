import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';
import logo from './logo.svg';

const theme = create({
  base: 'dark',

  // Brand
  brandTitle: 'danieljoffe/ui',
  brandUrl: 'https://danieljoffe.com',
  brandTarget: '_blank',
  brandImage: logo,

  // UI chrome — matches .dark token values
  colorPrimary: '#3aada2', // --accent (dark)
  colorSecondary: '#3aada2', // --accent (dark)

  // App background
  appBg: '#1c1917', // --background (dark)
  appContentBg: '#231f1d', // --background-alt (dark)
  appPreviewBg: '#1c1917', // --background (dark)
  appBorderColor: '#33302e', // --border (dark)
  appBorderRadius: 4, // --radius: 0.25rem = 4px

  // Text
  textColor: '#ece8e1', // --foreground (dark)
  textMutedColor: '#a8a29e', // --foreground-muted (dark)
  textInverseColor: '#1c1917',

  // Toolbar
  barTextColor: '#a8a29e', // --foreground-muted
  barHoverColor: '#ece8e1', // --foreground
  barSelectedColor: '#3aada2', // --accent
  barBg: '#231f1d', // --background-alt

  // Inputs
  inputBg: '#231f1d', // --input (dark)
  inputBorder: '#44403c', // --input-border (dark)
  inputTextColor: '#ece8e1', // --foreground
  inputBorderRadius: 4,
});

addons.setConfig({
  theme,
});
