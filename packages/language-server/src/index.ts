/* eslint-disable no-plusplus */
import { createConnection, createServer, createTypeScriptProject, loadTsdkByPath } from '@volar/language-server/node'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { create as createPrettierService } from 'volar-service-prettier'

import { AstroFormLanguagePlugin } from './core/index'
import { create as createHtmlService } from './plugins/html'
import { create as createAstroFormService } from './plugins/astro-form'

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
  return server.initialize(
    params,
    // language plugin
    createTypeScriptProject(tsdk.typescript, tsdk.diagnosticMessages, () => [AstroFormLanguagePlugin]),
    // service plugins
    [createHtmlService(), createEmmetService(), ...createTypeScriptServices(tsdk.typescript), createAstroFormService()]
  )
})

connection.onInitialized(() => {
  server.initialized()
  // don't know if this is needed
  server.watchFiles([`**/*.{${['aform'].join(',')}}`])
})

connection.onShutdown(server.shutdown)
