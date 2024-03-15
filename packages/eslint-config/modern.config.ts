import { moduleTools, defineConfig } from '@modern-js/module-tools'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [moduleTools()],
  buildPreset: 'npm-component',
  buildConfig: {
    format: 'cjs',
    outDir: './lib',
    dts: false,
  },
})
export default config
