# Tailwind CSS Upgrade Policy

## Current State

- **Locked version:** Tailwind CSS v3 (currently 3.4.19)
- **Configuration:** `tailwind.config.ts`, `postcss.config.js`, `app/globals.css`
- **Dependabot:** Major updates (`tailwindcss` and `@tailwindcss/*`) are ignored

## Why v3 is Locked

Tailwind CSS v4 is a breaking major release that requires coordinated changes across
the entire styling pipeline. It is not a drop-in upgrade. Automated dependency bumps
that only touch `package.json` and `package-lock.json` will fail at build time.

## What v4 Migration Requires

A dedicated migration project must address all of the following:

- Replace `@tailwind base/components/utilities` directives with `@import "tailwindcss"`
- Switch to `@tailwindcss/postcss` plugin in `postcss.config`
- Migrate `tailwind.config.ts` to CSS-based configuration
- Port all design tokens (colors, border-radius, shadows)
- Rewrite custom keyframes and animations for the v4 syntax
- Verify dark mode behavior
- Verify all custom utilities
- Run full visual regression across all pages
- Confirm minimum browser versions (Safari, Chrome, Firefox)

## Dependabot Behavior

- **Minor/patch updates** to Tailwind v3 are still allowed
- **Major updates** to `tailwindcss` and `@tailwindcss/*` are ignored
- Other dependencies are unaffected

## Future Migration

When Tailwind v4 migration is planned:

1. Create a feature branch from `main`
2. Follow the official [Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide)
3. Complete all checklist items above
4. Pass lint, unit tests, build, and visual regression
5. Remove the Dependabot ignore rule after successful migration
