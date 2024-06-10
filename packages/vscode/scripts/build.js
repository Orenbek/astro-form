/**
 * @satisfies {import('esbuild').BuildOptions}
 */
const config = {
  entryPoints: {
    client: './src/client.ts',
    server: '../language-server/src/index.ts',
  },
  sourcemap: true,
  bundle: true,
  metafile: process.argv.includes('--metafile'),
  outdir: './dist',
  external: ['vscode', '@astrojs/compiler'],
  format: 'cjs',
  platform: 'node',
  tsconfig: './tsconfig.json',
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: process.argv.includes('--minify'),
  plugins: [
    {
      name: 'umd2esm',
      setup(build) {
        build.onResolve({ filter: /^(vscode-.*-languageservice|jsonc-parser)/ }, (args) => {
          const pathUmdMay = require.resolve(args.path, { paths: [args.resolveDir] })
          // Call twice the replace is to solve the problem of the path in Windows
          const pathEsm = pathUmdMay.replace('/umd/', '/esm/').replace('\\umd\\', '\\esm\\')
          return { path: pathEsm }
        })
      },
    },
  ],
}

require('esbuild')
  .context(config)
  .then(async (ctx) => {
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
