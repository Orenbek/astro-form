import { moduleTools, defineConfig } from '@modern-js/module-tools'
import { testingPlugin } from '@modern-js/plugin-testing'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [moduleTools(), testingPlugin()],
  buildPreset: 'npm-library',
})
export default config
