import path from 'node:path'
import { moduleTools, defineConfig } from '@modern-js/module-tools'
import { testingPlugin } from '@modern-js/plugin-testing'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [moduleTools(), testingPlugin()],
  buildPreset: 'npm-component',
  buildConfig: {
    tsconfig: 'tsconfig.build.json',
  },
  testing: {
    jest: {
      // Source uses `@/*` (tsconfig paths); Jest does not read that by default.
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      // Override Modern.js default babel-jest transformer so class private
      // methods (`#foo`) work with legacy-decorator class-properties include.
      transform: {
        '\\.[jt]sx?$': path.join(__dirname, 'tests/babel-transformer.cjs'),
      },
      transformIgnorePatterns: [`node_modules/.pnpm/(?!(lodash-es|@modern-js\\+(runtime|plugin)|@formily\\+.*?)@)`],
      // Silence noisy console noise from core tests when needed.
      // setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
      setupFilesAfterEnv: [],
    },
  },
})
export default config
