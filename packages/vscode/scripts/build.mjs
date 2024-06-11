import { createRequire } from 'node:module'

import esbuild from 'esbuild'

const require = createRequire(import.meta.url)

export default async function build() {
  const isDev = process.argv.includes('--watch')
  const metaFile = process.argv.includes('--metafile')

  /**
   * @satisfies {import('esbuild').BuildOptions}
   */
  const config = {
    entryPoints: {
      'dist/client': './src/client.ts',
      'dist/server': '../language-server/src/index.ts',
      // We need to generate this inside node_modules so VS Code can resolve it
      'node_modules/astro-form-ts-plugin-bundle/index': './src/ts-plugin/index.ts',
    },
    sourcemap: isDev,
    bundle: true,
    metafile: metaFile,
    outdir: '.',
    external: ['vscode', '@astrojs/compiler', 'prettier', 'prettier-plugin-astro-form'],
    format: 'cjs',
    platform: 'node',
    tsconfig: './tsconfig.json',
    define: { 'process.env.NODE_ENV': '"production"' },
    minify: process.argv.includes('--minify'),
    plugins: [
      {
        name: 'umd2esm',
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /^(vscode-.*-languageservice|jsonc-parser)/ }, (args) => {
            const pathUmdMay = require.resolve(args.path, { paths: [args.resolveDir] })
            // Call twice the replace is to solve the problem of the path in Windows
            const pathEsm = pathUmdMay.replace('/umd/', '/esm/').replace('\\umd\\', '\\esm\\')
            return { path: pathEsm }
          })
        },
      },
    ],
  }

  if (!isDev) {
    const result = await esbuild.build(config)
    if (metaFile) fs.writeFileSync('meta.json', JSON.stringify(result.metafile))
  }

  const builder = await esbuild.context(config).then(async (ctx) => {
    console.log('building...')
    if (process.argv.includes('--watch')) {
      await ctx.watch()
      console.log('watching...')
    } else {
      await ctx.rebuild()
      await ctx.dispose()
      console.log('finished.')
    }
  })
}
build()
