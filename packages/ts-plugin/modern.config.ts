import { moduleTools, defineConfig } from '@modern-js/module-tools'
import { testingPlugin } from '@modern-js/plugin-testing'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [moduleTools(), testingPlugin()],
  buildPreset: 'npm-component',
  buildConfig: {
    tsconfig: 'tsconfig.build.json',
  },
})
export default config
