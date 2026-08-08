import { pluginReact } from '@rsbuild/plugin-react'
import { defineConfig } from '@rslib/core'

/**
 * Bundleless dual build (ESM + CJS) for @astro-form/react.
 * Layout mirrors the previous modern npm-component output so monorepo
 * consumers / language-server keep working:
 *   dist/es/**     ESM
 *   dist/lib/**    CJS
 *   dist/types/**  .d.ts
 */
export default defineConfig({
  source: {
    entry: {
      index: ['./src/**'],
    },
  },
  lib: [
    {
      format: 'esm',
      bundle: false,
      dts: {
        distPath: './dist/types',
      },
      output: {
        distPath: {
          root: './dist/es',
        },
        // Ambient JSX helper types used by language-server / consumers
        copy: [{ from: './src/astroform-jsx.d.ts', to: '../types/astroform-jsx.d.ts' }],
      },
    },
    {
      format: 'cjs',
      bundle: false,
      dts: false,
      output: {
        distPath: {
          root: './dist/lib',
        },
      },
    },
  ],
  output: {
    target: 'web',
  },
  plugins: [pluginReact()],
})
