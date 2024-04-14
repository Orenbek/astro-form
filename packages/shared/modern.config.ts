import { moduleTools, defineConfig } from '@modern-js/module-tools'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [moduleTools()],
  buildPreset: 'npm-library',
})
export default config
