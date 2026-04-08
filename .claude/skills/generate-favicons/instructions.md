# Generate Favicons

Generate all SEO/meta tag images from a source SVG icon.

## Usage

```
/generate-favicons <path-to-svg>
```

## Instructions

1. Run `./scripts/generate-favicons.sh <source-svg>` to generate all images into `apps/root/public/`.
2. Verify the output files exist and look correct.
3. If `site.webmanifest` references these files, confirm the filenames still match.

## What it generates

| File                         | Size     | Purpose                      |
| ---------------------------- | -------- | ---------------------------- |
| `favicon.svg`                | original | Modern browsers (scalable)   |
| `favicon.ico`                | 16+32+48 | Legacy browsers (multi-size) |
| `favicon.png`                | 512x512  | General PNG fallback         |
| `favicon-16x16.png`          | 16x16    | Browser tab (small)          |
| `favicon-32x32.png`          | 32x32    | Browser tab (standard)       |
| `favicon-48x48.png`          | 48x48    | Browser tab (HiDPI)          |
| `favicon-96x96.png`          | 96x96    | Shortcuts, taskbar           |
| `apple-touch-icon.png`       | 180x180  | iOS home screen              |
| `android-chrome-192x192.png` | 192x192  | Android/PWA                  |
| `android-chrome-512x512.png` | 512x512  | Android/PWA splash           |
| `mstile-150x150.png`         | 150x150  | Windows tiles                |

## Requirements

- `rsvg-convert` (from librsvg): `brew install librsvg`
- `magick` (ImageMagick): `brew install imagemagick`
