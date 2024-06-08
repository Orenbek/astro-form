import path from 'node:path'

import type { Compiler } from 'webpack'

export class AstroFormPlugin {
  // eslint-disable-next-line class-methods-use-this
  apply(compiler: Compiler) {
    compiler.hooks.normalModuleFactory.tap('AstroFormPlugin', (nmf) => {
      nmf.hooks.afterResolve.tapAsync('AstroFormPlugin', async (resolveData, callback) => {
        if (resolveData.request.endsWith('.aform')) {
          const filepath = resolveData.createData.resource!
          const filename = path.basename(filepath).slice(0, -6)
          resolveData.createData.loaders!.push({
            loader: path.resolve(__dirname, 'loader.js'),
            options: { filename },
            ident: null,
            type: null,
          })
        }
        callback(null)
      })
    })
  }
}
