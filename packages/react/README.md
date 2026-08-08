# @astro-form/react

React bindings for Astro Form (Rslib + Rstest + Storybook).

## Scripts

```bash
pnpm build            # Build ESM + CJS + d.ts
pnpm dev              # Watch mode
pnpm typecheck        # tsc --noEmit (src / node / tests / stories)
pnpm test             # Run unit tests (rstest)
pnpm test:watch       # Watch tests
pnpm storybook        # Storybook dev server
pnpm build:storybook  # Build static Storybook
```

## Output

| Path | Content |
|------|---------|
| `dist/es/*.mjs` | ESM (bundleless) |
| `dist/lib/*.js` | CJS (bundleless) |
| `dist/types` | TypeScript declarations (+ `astroform-jsx.d.ts`) |

## Docs

- Rslib: https://rslib.rs/
- Rstest: https://rstest.rs/
- Storybook + Rsbuild: https://storybook.rsbuild.rs/
