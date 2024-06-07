/* eslint-disable no-plusplus */
import {
  createConnection,
  createServer,
  createTypeScriptProject,
  Diagnostic,
  loadTsdkByPath,
} from '@volar/language-server/node'
import { create as createEmmetService } from 'volar-service-emmet'
import { create as createHtmlService } from 'volar-service-html'
import { create as createTypeScriptServices } from 'volar-service-typescript'
import { create as createPrettierService } from 'volar-service-prettier'
import { URI } from 'vscode-uri'

import { html1LanguagePlugin, Html1VirtualCode } from './languagePlugin'

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
    createTypeScriptProject(tsdk.typescript, tsdk.diagnosticMessages, () => [html1LanguagePlugin]),
    // service plugins
    [
      createHtmlService(),
      createEmmetService(),
      ...createTypeScriptServices(tsdk.typescript),
      {
        capabilities: {
          diagnosticProvider: true,
        },
        create(context) {
          return {
            provideDiagnostics(document) {
              const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
              if (!decoded) {
                // Not a embedded document
                return
              }
              const virtualCode = context.language.scripts.get(decoded[0])?.generated?.embeddedCodes.get(decoded[1])
              if (!(virtualCode instanceof Html1VirtualCode)) {
                return
              }
              const styleNodes = virtualCode.htmlDocument.roots.filter((root) => root.tag === 'style')
              if (styleNodes.length <= 1) {
                return
              }
              const errors: Diagnostic[] = []
              for (let i = 1; i < styleNodes.length; i++) {
                errors.push({
                  severity: 2,
                  range: {
                    start: document.positionAt(styleNodes[i].start),
                    end: document.positionAt(styleNodes[i].end),
                  },
                  source: 'html1',
                  message: 'Only one style tag is allowed.',
                })
              }
              // eslint-disable-next-line consistent-return
              return errors
            },
          }
        },
      },
    ]
  )
})

connection.onInitialized(() => {
  server.initialized()
  // don't know if this is needed
  server.watchFiles([`**/*.{${['aform'].join(',')}}`])
})

connection.onShutdown(server.shutdown)
