export const criticalStyles = `
:root {
  --font-heading: 'Fraunces', Georgia, 'Times New Roman', serif;
  --font-body: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  --font-mono: 'IBM Plex Mono', Consolas, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-xl: 1.125rem;
  --text-2xl: 1.375rem;
  --text-3xl: 1.75rem;
  --text-4xl: clamp(2rem, 3vw + 1rem, 2.75rem);
  --text-5xl: 3.052rem;
  --text-6xl: 3.815rem;

  --leading-none: 1;
  --leading-tight: 1.2;
  --leading-snug: 1.25;
  --leading-normal: 1.3;
  --leading-relaxed: 1.4;
  --leading-loose: 1.5;

  --tracking-tighter: -0.02em;
  --tracking-tight: -0.01em;
  --tracking-normal: 0;

  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
}

html {
  font-size: 16px;
}

html,
p,
ul,
ol,
figure {
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  font-weight: var(--font-normal);
  line-height: var(--leading-loose);
  letter-spacing: var(--tracking-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'kern' 1, 'liga' 1;
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
  background-color: #f5f5f5;
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 4.5rem 0 0;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: var(--font-heading);
  text-wrap: balance;
}

h1,
h2,
h3,
h4 {
  font-weight: var(--font-semibold);
}

h5,
h6 {
  font-weight: var(--font-medium);
}

h1 {
  font-size: var(--text-4xl);
  letter-spacing: var(--tracking-tighter);
  line-height: var(--leading-tight);
  font-variation-settings: 'opsz' 144, 'WONK' 1;
  margin-top: 0;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: var(--text-3xl);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-snug);
  font-variation-settings: 'opsz' 72, 'WONK' 1;
  margin-top: 3rem;
  margin-bottom: 1rem;
}

h3 {
  font-size: var(--text-2xl);
  line-height: var(--leading-normal);
  font-variation-settings: 'opsz' 36, 'WONK' 0;
  margin-top: 2.5rem;
  margin-bottom: 0.75rem;
}

h4 {
  font-size: var(--text-xl);
  line-height: var(--leading-relaxed);
  font-variation-settings: 'opsz' 24, 'WONK' 0;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}

h5 {
  font-size: var(--text-sm);
  line-height: var(--leading-loose);
  font-weight: var(--font-medium);
  font-variation-settings: 'opsz' 12, 'WONK' 0;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

h6 {
  font-size: var(--text-sm);
  line-height: var(--leading-loose);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  font-variation-settings: 'opsz' 12, 'WONK' 0;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

ul,
ol {
  list-style: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus,
.focus\\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

:is(h1, h2, h3, h4, h5, h6):first-child {
  margin-top: 0;
}

@media (min-width: 640px) {
  html {
    font-size: 18px;
  }

  body {
    padding-top: 3.5rem;
  }
}
`;
