/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { CompletionItemKind, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-server'
import { create as createHtmlService } from 'volar-service-html'
import { URI } from 'vscode-uri'

import { AstroFormVirtualCode } from '../core/index'

import { isInComponentStartTag } from './utils'

const RemainCompletionKinds = [
  // label completion kind
  CompletionItemKind.Property,
  CompletionItemKind.Unit,
  CompletionItemKind.Keyword,
  CompletionItemKind.Snippet,
]

export const create = (): LanguageServicePlugin => {
  const htmlServicePlugin = createHtmlService()
  return {
    ...htmlServicePlugin,
    create(context): LanguageServicePluginInstance {
      const htmlPlugin = htmlServicePlugin.create(context)

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

          // filter out most of the auto completions
          completions.items = completions.items.filter((completion) =>
            RemainCompletionKinds.includes(completion.kind as any)
          )

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
