import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ['react', 'import'],
    env: {
      browser: true,
      node: true,
      es6: true,
      es2024: true,
    },
    ignorePatterns: [
      '**/dist/**',
      '**/es/**',
      '**/lib/**',
      '**/output/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/.turbo/**',
      '**/coverage/**',
      '**/thoughts/**',
      // Sample HTML fixtures use aform-like tags; not regular web HTML.
      '**/*.html',
      // Tests/stories use jest/storybook globals and looser tsconfigs; gate src only for now.
      '**/tests/**',
      '**/stories/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.stories.tsx',
      '**/.storybook/**',
      // Build scripts are plain JS/MJS tooling, not library sources.
      '**/scripts/**',
      // Product sample app still has known build issues; keep out of the quality gate for now.
      'apps/examples/**',
    ],
  },
  fmt: {
    semi: false,
    tabWidth: 2,
    singleQuote: true,
    trailingComma: 'es5',
    printWidth: 120,
    // .aform is formatted by prettier-plugin-astro-form (LS / vscode), not oxfmt.
    ignorePatterns: [
      '**/*.aform',
      '**/*.md',
      '**/*.html',
      '**/pnpm-lock.yaml',
      '**/dist/**',
      '**/es/**',
      '**/lib/**',
      '**/thoughts/**',
      '**/node_modules/**',
    ],
    overrides: [
      {
        files: ['*.json', '*.jsonc'],
        options: {
          trailingComma: 'none',
        },
      },
    ],
  },
  staged: {
    '*': 'vp check --fix --no-error-on-unmatched-pattern',
  },
})
