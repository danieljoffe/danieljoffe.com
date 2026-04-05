export const fraunces = {
  className: '',
  style: { fontFamily: 'Georgia, Times New Roman, serif' },
  variable: '--font-sans',
};

export const inter = {
  className: '',
  style: { fontFamily: 'system-ui, -apple-system, sans-serif' },
  variable: '--font-sans',
};

export const ibmPlexMono = {
  className: '',
  style: { fontFamily: 'Consolas, Monaco, monospace' },
  variable: '--font-mono',
};

export const fontVariables = `${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`;
