import { appTools, defineConfig } from '@modern-js/app-tools'
import { AstroFormPlugin } from '@astro-form/webpack-plugin'

// https://modernjs.dev/en/configure/app/usage
const config: ReturnType<typeof defineConfig> = defineConfig({
  runtime: {
    router: true,
  },
  plugins: [
    appTools({
      bundler: 'webpack', // Set to 'experimental-rspack' to enable rspack ⚡️🦀
    }),
  ],
  tools: {
    bundlerChain: (chain) => {
      chain.plugin('AstroFormPlugin').use(AstroFormPlugin)
    },
  },
})
export default config
