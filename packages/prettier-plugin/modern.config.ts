import { moduleTools, defineConfig } from '@modern-js/module-tools'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [moduleTools()],
  buildPreset: 'npm-library',
  buildConfig: {
    tsconfig: 'tsconfig.build.json',
    externals: ['prettier', '@astro-form/compiler'],
  },
})
export default config
