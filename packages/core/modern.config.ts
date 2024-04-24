import { moduleTools, defineConfig } from '@modern-js/module-tools'
import { testingPlugin } from '@modern-js/plugin-testing'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [moduleTools(), testingPlugin()],
  buildPreset: 'npm-library',
  testing: {
    jest: {
      moduleNameMapper: {},
      transformIgnorePatterns: [`node_modules/.pnpm/(?!(lodash-es|@modern-js\\+(runtime|plugin)|@formily\\+.*?)@)`],
      setupFilesAfterEnv: [], // '<rootDir>/tests/jest.setup.js'
    },
  },
})
export default config
