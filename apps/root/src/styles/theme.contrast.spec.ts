// WCAG 2.1 AA contrast contract for the *app* theme tokens (apps/root).
//
// The shared-ui library ships its own contrast.tokens.spec.ts, but it can only
// see shared-ui's theme files — module boundaries stop it reaching into this
// app. The app overrides several tokens in src/styles/theme.css (e.g.
// --color-error), so those need their own guard here. This is the gap that let
// a 3.6:1 error red ship: the existing test vouched for a stylesheet the app
// doesn't use. See blog/storybook-preview-token-drift.
//
// Parses the real theme CSS so it can never drift from what ships.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// --- color math: oklch | hex -> sRGB -> WCAG relative luminance ---
function oklchToSrgb(L: number, C: number, h: number): number[] {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(x => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  });
}
function hexToSrgb(hex: string): number[] {
  const n = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
}
function toSrgb(value: string): number[] | null {
  const v = value.trim();
  if (v.startsWith('oklch(')) {
    const [L, C, h] = v
      .slice(6, v.indexOf(')'))
      .split('/')[0]
      .trim()
      .split(/\s+/)
      .map(Number);
    return oklchToSrgb(L, C, h);
  }
  if (v.startsWith('#')) return hexToSrgb(v);
  return null; // rgba()/other — not used in contrast pairs
}
function luminance(srgb: number[]): number {
  const [r, g, b] = srgb.map(c =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg: string, bg: string): number {
  const l1 = luminance(toSrgb(fg) as number[]);
  const l2 = luminance(toSrgb(bg) as number[]);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// --- parse theme.css @theme (light) + .dark token maps ---
type Tokens = Record<string, string>;
function parseTheme(): { light: Tokens; dark: Tokens } {
  const css = readFileSync(join(__dirname, 'theme.css'), 'utf8');
  const block = (selector: string): Tokens => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`${escaped}\\s*\\{`);
    const m = re.exec(css);
    if (!m) return {};
    const open = m.index + m[0].length - 1;
    const body = css.slice(open + 1, css.indexOf('}', open));
    const out: Tokens = {};
    for (const d of body.matchAll(/(--color-[\w-]+):\s*([^;]+);/g))
      out[d[1]] = d[2].trim();
    return out;
  };
  const light = block('@theme');
  return { light, dark: { ...light, ...block('.dark') } };
}

const TEXT = 4.5;
const UI = 3.0;
// Text-on-surface pairs only. Status accents (--color-success/warning/info) are
// bright by design and are used as icons/dots/badges *alongside* text labels —
// never as the sole carrier of meaning — so they're not asserted as 4.5 text
// here. This matrix guards the body/meta/error text and the focus ring; the
// error pairs are what would have caught the 3.6:1 red that shipped.
// [foreground, background, min-ratio, label]
const PAIRS: [string, string, number, string][] = [
  ['--color-text-primary', '--color-surface', TEXT, 'body text'],
  ['--color-text-secondary', '--color-surface', TEXT, 'secondary text'],
  ['--color-text-tertiary', '--color-surface', TEXT, 'tertiary text'],
  ['--color-text-brand', '--color-surface', TEXT, 'brand text'],
  ['--color-text-secondary', '--color-surface-secondary', TEXT, 'meta on card'],
  ['--color-error', '--color-surface', TEXT, 'error text/surface'],
  // The contact form (and every card) sits on surface-secondary — the surface
  // the error message actually renders on, and the one that was failing.
  ['--color-error', '--color-surface-secondary', TEXT, 'error text/card'],
  ['--color-border-focus', '--color-surface', UI, 'focus ring'],
];

type Row = {
  mode: string;
  pair: string;
  ratio: number;
  min: number;
  pass: boolean;
};

function grade(): Row[] {
  const modes = parseTheme();
  const rows: Row[] = [];
  for (const mode of ['light', 'dark'] as const) {
    const tok = modes[mode];
    for (const [fg, bg, min, pair] of PAIRS) {
      if (!tok[fg] || !tok[bg]) continue;
      const ratio = Math.round(contrast(tok[fg], tok[bg]) * 100) / 100;
      rows.push({ mode, pair, ratio, min, pass: ratio >= min });
    }
  }
  return rows;
}

describe('app theme token contrast (WCAG 2.1 AA)', () => {
  it('every declared token pair meets its contrast threshold', () => {
    const rows = grade();
    console.table(rows.map(r => ({ ...r, pass: r.pass ? '✓' : '✗' })));
    const report = rows
      .filter(r => !r.pass)
      .map(f => `${f.mode} ${f.pair}: ${f.ratio} (need ${f.min})`)
      .join('\n');
    expect(report).toBe('');
  });
});
