import path from 'node:path'

import type { Compiler } from 'webpack'

export class AstroFormPlugin {
  // eslint-disable-next-line class-methods-use-this
  apply(compiler: Compiler) {
    compiler.hooks.normalModuleFactory.tap('AstroFormPlugin', (nmf) => {
      nmf.hooks.afterResolve.tapAsync('AstroFormPlugin', async (resolveData, callback) => {
        if (resolveData.request.endsWith('.aform')) {
          resolveData.createData.loaders!.push({
            loader: path.resolve(__dirname, 'loader.js'),
            options: {},
            ident: null,
            type: null,
          })
        }
        callback(null)
      })
    })
  }
}
