import { moduleTools, defineConfig } from '@modern-js/module-tools'
import { testingPlugin } from '@modern-js/plugin-testing'

const config: ReturnType<typeof defineConfig> = defineConfig({
  plugins: [moduleTools(), testingPlugin()],
  buildPreset({ extendPreset }) {
    return extendPreset('npm-component', {
      copy: {
        patterns: [{ from: '*.d.ts', to: '' }],
      },
    })
  },
  buildConfig: {
    tsconfig: 'tsconfig.build.json',
  },
})
export default config
