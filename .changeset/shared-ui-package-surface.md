---
'@danieljoffe/shared-ui': patch
---

Packaging fixes for what the published tarball actually contains.

`CHANGELOG.md` is now published, so release notes are readable from the
registry rather than only on GitHub. The two theme stylesheets are published
explicitly instead of via the whole `src/styles` directory, which was also
shipping three Storybook-only files (`preview.scss`,
`pyre-storybook-preview.css`, `storybook-docs.css`) that no `exports` path
could reach.

`sideEffects` no longer claims the entire package is effect-free: it now lists
`**/*.css` and `**/*.scss`, so a bundler cannot tree-shake away a consumer's
`@import '@danieljoffe/shared-ui/styles/indigo-theme.css'`.

The README's theme-setup instructions pointed at
`@danieljoffe/shared-ui/styles/theme.css`, which has not existed since that
file was split into `indigo-theme.css` and `pyre-theme.css` — the documented
quick start could not resolve. It now names the real paths and documents both
themes.
