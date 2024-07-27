import type { CompletionList, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-server'
import { URI } from 'vscode-uri'
import { LocationLink } from '@volar/language-server'
import * as html from 'vscode-html-languageservice'

import { AstroFormVirtualCode } from '../../core/index'
import { getDocumentContext, isInsideFrontmatter, textSelectionOnOffset } from '../utils'
import { AstroFormFieldDirectives, AstroFormFieldTagNames } from '../../utils/constant'
import { astroFormElements } from '../html-data'

import { getSnippetCompletions } from './snippets'

const htmlLs = html.getLanguageService({ useDefaultDataProvider: true, customDataProviders: [astroFormElements] })

export const create = (): LanguageServicePlugin => {
  return {
    name: 'astro-form-typescript-addons-service',
    capabilities: {
      completionProvider: {
        triggerCharacters: ['interface'],
      },
      definitionProvider: true,
    },
    create(context): LanguageServicePluginInstance {
      const documentContext = getDocumentContext(context)
      return {
        isAdditionalCompletion: true,
        // Q: Why the empty transform and resolve functions?
        // A: Volar will skip mapping the completion items if those functions are defined, as such we can return the snippets
        // completions as-is, this is notably useful for snippets that insert to the frontmatter, since we don't need to map anything.
        transformCompletionItem(item) {
          return item
        },
        async provideCompletionItems(document, position, completionContext, token) {
          if (
            !context ||
            token.isCancellationRequested ||
            completionContext.triggerKind === 2 ||
            document.languageId !== 'html'
          )
            return null
          const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
          const sourceScript = decoded && context.language.scripts.get(decoded[0])
          const root = sourceScript?.generated?.root
          if (!(root instanceof AstroFormVirtualCode)) return undefined

          if (isInsideFrontmatter(document.offsetAt(position), root.astroMeta.frontmatter)) {
            const completionList: CompletionList = {
              items: getSnippetCompletions(root.astroMeta.frontmatter),
              isIncomplete: false,
            }
            return completionList
          }
          const node = root.htmlDocument.findNodeAt(document.offsetAt(position))
          const isAstroFormField = AstroFormFieldTagNames.includes(node?.tag || '')
          if (isAstroFormField) {
            const completions = await htmlLs.doComplete2(document, position, root.htmlDocument, documentContext)
            completions.items = completions.items.filter((completion) => {
              if (
                isAstroFormField &&
                completion.kind === html.CompletionItemKind.Value &&
                AstroFormFieldDirectives.includes(completion.label)
              ) {
                // 允许 AstroForm directives 自动补全，typescript不会做补全，仅仅能提供类型提示
                // 也许 typescript service 也可以针对这个类型做特殊处理，让他支持补全，但在 html service 插件里处理应该是更方便的。
                // 另外，newText 也得更新，补全得是 bracket 形式的
                // eslint-disable-next-line no-param-reassign
                completion.textEdit!.newText = `${completion.label}={$1}`
                return true
              }
              return false
            })
            return completions
          }
          return null
        },
        resolveCompletionItem(item) {
          return item
        },
        provideDefinition(document, position, token) {
          // 单独支持 AstroForm directives 的 Go To Definition 能力。ts 默认会忽略 jsx 中 a:b="c" 这种类型的 attribute 类型跳转。
          if (!context || token.isCancellationRequested || document.languageId !== 'html') return null
          const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
          const sourceScript = decoded && context.language.scripts.get(decoded[0])
          const root = sourceScript?.generated?.root
          if (!(root instanceof AstroFormVirtualCode)) return undefined
          const target = root.htmlDocument.findNodeAt(document.offsetAt(position))
          const curToken = textSelectionOnOffset(document.getText(), document.offsetAt(position))
          if (
            !target ||
            !AstroFormFieldTagNames.includes(target.tag || '') ||
            !curToken ||
            !AstroFormFieldDirectives.includes(curToken)
          ) {
            return null
          }
          const link = typeDefLocationLinkCreate(root.additionalFileName, root.additionalTypeFileContent, curToken)
          return [link]
        },
      }
    },
  }
}

function typeDefLocationLinkCreate(filename: string, fileContent: string, token: string) {
  const prefix = fileContent.slice(0, fileContent.indexOf(`'${token}'`)).split('\n')
  const line = prefix.length - 1
  const character = prefix[prefix.length - 1].length
  const range = {
    start: { line, character },
    end: {
      line,
      character: character + token.length + 2,
    },
  }
  const link = LocationLink.create(URI.file(filename).toString(), range, range)
  return link
}
