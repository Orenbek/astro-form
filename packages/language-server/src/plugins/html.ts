/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { CompletionItemKind, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-server'
import { create as createHtmlService } from 'volar-service-html'
import * as html from 'vscode-html-languageservice'
import { URI, Utils } from 'vscode-uri'

import { AstroFormVirtualCode } from '../core/index'

import { astroFormElements } from './html-data'
import { isInComponentStartTag } from './utils'

export const create = (): LanguageServicePlugin => {
  const htmlServicePlugin = createHtmlService({
    getCustomData: async (context) => {
      const customData: string[] = (await context.env.getConfiguration?.('html.customData')) ?? []
      /** this part is the default logic of volar-service-html getCustomData method, we just need to add our custom data to it. */
      const newData: html.IHTMLDataProvider[] = []
      for (const customDataPath of customData) {
        const uri = Utils.resolvePath(context.env.workspaceFolders[0], customDataPath)
        const json = await context.env.fs?.readFile?.(uri)
        if (json) {
          try {
            const data = JSON.parse(json)
            newData.push(html.newHTMLDataProvider(customDataPath, data))
          } catch (error) {
            console.error(error)
          }
        }
      }
      return [...newData, astroFormElements]
    },
  })
  return {
    ...htmlServicePlugin,
    create(context, languageService): LanguageServicePluginInstance {
      const htmlPlugin = htmlServicePlugin.create(context, languageService)

      return {
        ...htmlPlugin,
        async provideCompletionItems(document, position, completionContext, token) {
          if (document.languageId !== 'html') return

          const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
          const sourceScript = decoded && context.language.scripts.get(decoded[0])
          const root = sourceScript?.generated?.root
          if (!(root instanceof AstroFormVirtualCode)) return

          // Don't return completions if the current node is a component
          if (isInComponentStartTag(root.htmlDocument, document.offsetAt(position))) {
            return null
          }

          const completions = await htmlPlugin.provideCompletionItems!(document, position, completionContext, token)

          if (!completions) {
            return null
          }

          // We don't want completions for file references, as they're mostly invalid for Astro
          completions.items = completions.items.filter((completion) => completion.kind !== CompletionItemKind.File)

          return completions
        },
        // Document links provided by `vscode-html-languageservice` are invalid for Astro
        provideDocumentLinks() {
          return []
        },
      }
    },
  }
}
