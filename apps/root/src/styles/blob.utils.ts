export type Theme = {
  '--stop-color-one': string;
  '--stop-color-two': string;
  '--stop-color-three': string;
  '--stop-color-four': string;
  '--stop-color-five': string;
  '--stop-color-six': string;
  '--stop-color-seven': string;
  '--stop-color-eight': string;
};

export const themeOne: Theme = {
  '--stop-color-one': '#003f5b',
  '--stop-color-two': '#2b4b7d',
  '--stop-color-three': '#5f5195',
  '--stop-color-four': '#98509d',
  '--stop-color-five': '#cc4c91',
  '--stop-color-six': '#f25375',
  '--stop-color-seven': '#ff6f4e',
  '--stop-color-eight': '#ff9913',
};

export const themeTwo: Theme = {
  '--stop-color-one': '#142850',
  '--stop-color-two': '#14365f',
  '--stop-color-three': '#13476f',
  '--stop-color-four': '#125d80',
  '--stop-color-five': '#107792',
  '--stop-color-six': '#0d96a5',
  '--stop-color-seven': '#09b8b4',
  '--stop-color-eight': '#04ccb1',
};
export const themeThree: Theme = {
  '--stop-color-one': '#f7ff0a',
  '--stop-color-two': '#ffd000',
  '--stop-color-three': '#ffa026',
  '--stop-color-four': '#ff7144',
  '--stop-color-five': '#f9455b',
  '--stop-color-six': '#d71c6d',
  '--stop-color-seven': '#ab0478',
  '--stop-color-eight': '#77107b',
};
export const themeFour: Theme = {
  '--stop-color-one': '#ffdf42',
  '--stop-color-two': '#ffcb2a',
  '--stop-color-three': '#ffb60e',
  '--stop-color-four': '#ffa000',
  '--stop-color-five': '#ff8900',
  '--stop-color-six': '#ff6f00',
  '--stop-color-seven': '#ff5000',
  '--stop-color-eight': '#ff2212',
};
export const themeFive: Theme = {
  '--stop-color-one': '#b70c00',
  '--stop-color-two': '#c10020',
  '--stop-color-three': '#c6003a',
  '--stop-color-four': '#c50055',
  '--stop-color-five': '#bd0073',
  '--stop-color-six': '#aa0093',
  '--stop-color-seven': '#8c00b2',
  '--stop-color-eight': '#5900cd',
};
export const themeSix: Theme = {
  '--stop-color-one': '#f7ff0a',
  '--stop-color-two': '#ffd000',
  '--stop-color-three': '#ffa026',
  '--stop-color-four': '#ff7144',
  '--stop-color-five': '#f9455b',
  '--stop-color-six': '#d71c6d',
  '--stop-color-seven': '#ab0478',
  '--stop-color-eight': '#77107b',
};
export const themeSeven: Theme = {
  '--stop-color-one': '#ffe5ce',
  '--stop-color-two': '#ffd0ba',
  '--stop-color-three': '#ffb9b0',
  '--stop-color-four': '#ffa2b0',
  '--stop-color-five': '#fd8dba',
  '--stop-color-six': '#ec7cca',
  '--stop-color-seven': '#cd72de',
  '--stop-color-eight': '#9c71f2',
};
export const themeEight: Theme = {
  '--stop-color-one': '#7d0928',
  '--stop-color-two': '#962521',
  '--stop-color-three': '#ad3e0f',
  '--stop-color-four': '#c15900',
  '--stop-color-five': '#d27500',
  '--stop-color-six': '#de9200',
  '--stop-color-seven': '#e6b100',
  '--stop-color-eight': '#e8d103',
};
export const themeNine: Theme = {
  '--stop-color-one': '#f5e7f8',
  '--stop-color-two': '#cfd9f8',
  '--stop-color-three': '#9cd2e3',
  '--stop-color-four': '#83c6ae',
  '--stop-color-five': '#9ead69',
  '--stop-color-six': '#bf8641',
  '--stop-color-seven': '#c36064',
  '--stop-color-eight': '#9e4f9b',
};

export const themes = {
  1: themeOne,
  2: themeTwo,
  3: themeThree,
  4: themeFour,
  5: themeFive,
  6: themeSix,
  7: themeSeven,
  8: themeEight,
  9: themeNine,
};

export const setGradientTheme = (): void => {
  // Pick a random theme number between 1 and 9 (inclusive)
  const randomNumber = Math.max(1, Math.floor(Math.random() * 10));
  const randomTheme = themes[randomNumber as keyof typeof themes];

  // Only register CSS custom properties once per property name
  Object.entries(randomTheme).forEach(([key, value]: [string, string]) => {
    // Check if CSS.registerProperty exists
    if (
      typeof window !== 'undefined' &&
      typeof window.CSS !== 'undefined' &&
      typeof window.CSS.registerProperty === 'function'
    ) {
      // Use a global Set to track registered properties
      type WindowWithRegisteredCSSProps = Window & {
        __registeredCSSProps?: Set<string>;
      };
      const win = window as WindowWithRegisteredCSSProps;
      if (!win.__registeredCSSProps) {
        win.__registeredCSSProps = new Set<string>();
      }
      const registered = win.__registeredCSSProps;
      if (!registered.has(key)) {
        try {
          // TypeScript does not have a built-in type for registerProperty, so we cast
          (
            window.CSS.registerProperty as unknown as (definition: {
              name: string;
              syntax: string;
              inherits: boolean;
              initialValue: string;
            }) => void
          )({
            name: key,
            syntax: '<color>',
            inherits: true,
            initialValue: value,
          });
          registered.add(key);
        } catch (_error) {
          // Optionally, handle or log the error here
          // e.g. Sentry.captureException(err);
        }
      } else {
        document.documentElement.style.setProperty(key, value);
      }
    }
  });
};
