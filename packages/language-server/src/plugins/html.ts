/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { CompletionItemKind, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-server'
import { create as createHtmlService } from 'volar-service-html'
import * as html from 'vscode-html-languageservice'
import { URI, Utils } from 'vscode-uri'

import { AstroFormVirtualCode } from '../core/index'
import { AstroFormFieldDirectives, AstroFormFieldTagNames } from '../utils/constant'

import { isInComponentStartTag } from './utils'
import { astroFormElements } from './html-data'

const RemainCompletionKinds = [
  // label completion kind
  CompletionItemKind.Property,
  CompletionItemKind.Unit,
  CompletionItemKind.Keyword,
  CompletionItemKind.Snippet,
]

export const create = (): LanguageServicePlugin => {
  const htmlServicePlugin = createHtmlService({
    configurationSections: {
      // don't allow auto create quotes
      autoCreateQuotes: 'doesnt_exist_config_key',
      autoClosingTags: 'html.autoClosingTags',
    },
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

          const node = root.htmlDocument.findNodeAt(document.offsetAt(position))
          const isAstroFormField = AstroFormFieldTagNames.includes(node?.tag || '')

          // Don't return completions if the current node is a component
          if (!isAstroFormField && isInComponentStartTag(root.htmlDocument, document.offsetAt(position))) {
            return null
          }

          const completions = await htmlPlugin.provideCompletionItems!(document, position, completionContext, token)

          if (!completions) {
            return null
          }

          // filter out most of the auto completions
          completions.items = completions.items.filter((completion) => {
            if (
              isAstroFormField &&
              completion.kind === CompletionItemKind.Value &&
              AstroFormFieldDirectives.includes(completion.label)
            ) {
              // 允许 AstroForm directives 自动补全，typescript不会做补全，仅仅能提供类型提示
              // 也许 typescript service 也可以针对这个类型做特殊处理，让他支持补全，但在 html service 插件里处理应该是更方便的。
              // 另外，newText 也得更新，补全得是 bracket 形式的
              // eslint-disable-next-line no-param-reassign
              completion.textEdit!.newText = `${completion.label}={$1}`
              return true
            }
            return RemainCompletionKinds.includes(completion.kind as any)
          })

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
