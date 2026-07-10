# @danieljoffe/eslint-config

Shareable ESLint rules for the [danieljoffe.com](https://danieljoffe.com) design system. They steer code toward [`@danieljoffe/shared-ui`](https://www.npmjs.com/package/@danieljoffe/shared-ui) primitives instead of raw HTML, so consumers get the library's accessibility and theming for free.

## Install

```bash
npm install -D @danieljoffe/eslint-config
```

Requires ESLint 9+ (flat config).

> Inside the danieljoffe.com monorepo this package is consumed as a workspace dependency (`"@danieljoffe/eslint-config": "workspace:*"`).

## Usage

```js
// eslint.config.mjs
import danieljoffe from '@danieljoffe/eslint-config';

export default [
  // ...your config
  ...danieljoffe.configs.recommended,
];
```

Or register the plugin and pick rules à la carte:

```js
import danieljoffe from '@danieljoffe/eslint-config';

export default [
  {
    files: ['**/*.tsx'],
    plugins: { '@danieljoffe': danieljoffe },
    rules: {
      '@danieljoffe/prefer-primitives': 'warn',
    },
  },
];
```

## Rules

| Rule                  | Description                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `require-button-name` | Require a `name` prop on `<Button>` (skips `as="link"`) — for testability + analytics.                                                                         |
| `no-raw-headings`     | Disallow raw `<h1>`–`<h6>`; use the `Heading` component for a consistent type scale.                                                                           |
| `prefer-primitives`   | Flag raw `<button>`, `<input>`, `<table>`, `<select>`, `<textarea>` where a shared-ui primitive exists. Accepts `{ allow: string[] }` to exempt specific tags. |

## License

[FSL-1.1-MIT](https://fsl.software/) — Functional Source License 1.1 with MIT Future License.
