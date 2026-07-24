---
'@danieljoffe/shared-ui': minor
---

Button: `primary` is now a solid brand fill with **white text in every theme**, and the `strong` variant is removed.

Every filled Button is now white-on-color, so `primary` is no longer the odd one out. On the **Pyre** theme `primary` renders white on a darkened chartreuse (`brand-strong`, ≈5:1) instead of near-black on the bright chartreuse — the bright signature chartreuse is too light to carry white at WCAG AA. On **Indigo** `primary` is unchanged (its `brand-strong` equals `brand-500`).

**Breaking:** the `strong` variant (added in 0.7.0) is removed — its white-on-green treatment is now the default `primary`. Replace any `variant="strong"` with `variant="primary"`.
