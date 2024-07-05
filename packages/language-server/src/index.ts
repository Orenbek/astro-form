/* eslint-disable no-plusplus */
import path from 'node:path'

import { createConnection, createServer, createTypeScriptProject, loadTsdkByPath } from '@volar/language-server/node'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'

import { getAstroFormLanguagePlugin } from './core/index'
import { create as createHtmlService } from './plugins/html'
import { create as createAstroFormService } from './plugins/astro-form'
import { create as createPrettierService } from './plugins/prettier'
import { create as createTypescriptAddonsService } from './plugins/typescript-addons/index'
import { getAstroFormInstall } from './utils/get-astro-form-install'

const connection = createConnection()
const server = createServer(connection)

connection.listen()

connection.onInitialize((params) => {
  if (!params.initializationOptions?.typescript?.tsdk) {
    throw new Error(
      'The `typescript.tsdk` init option is required. It should point to a directory containing a `typescript.js` or `tsserverlibrary.js` file, such as `node_modules/typescript/lib`.'
    )
  }
  const tsdk = loadTsdkByPath(params.initializationOptions.typescript.tsdk, params.locale)
  const ts = tsdk.typescript
  return server.initialize(
    params,
    // language plugin
    createTypeScriptProject(ts, tsdk.diagnosticMessages, (env, project) => {
      const tsconfig = project.configFileName
      const rootPath = tsconfig ? tsconfig.split('/').slice(0, -1).join('/') : env.workspaceFolders[0].fsPath
      const nearestPackageJson = ts.findConfigFile(rootPath, ts.sys.fileExists, 'package.json')
      const astroFormInstall = getAstroFormInstall([rootPath], {
        nearestPackageJson,
        readDirectory: ts.sys.readDirectory,
      })
      const languageServerTypesDirectory = ts.sys.resolvePath(path.resolve(__dirname, '..'))
      const filename = ts.sys.resolvePath(
        path.resolve(
          typeof astroFormInstall === 'string' ? languageServerTypesDirectory : astroFormInstall.path,
          './dist/types/astroform-jsx.d.ts'
        )
      )
      return [getAstroFormLanguagePlugin(ts, filename)]
    }),
    // service plugins
    [
      createHtmlService(),
      createEmmetService(),
      ...createTypeScriptServices(ts),
      createTypescriptAddonsService(),
      createAstroFormService(),
      createPrettierService(connection),
    ]
  )
})

connection.onInitialized(() => {
  server.initialized()
  // don't know if this is needed
  server.watchFiles([`**/*.{${['aform'].join(',')}}`])
})

connection.onShutdown(server.shutdown)
