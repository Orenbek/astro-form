import type { CompletionList, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-server'
import { URI } from 'vscode-uri'
import { LocationLink } from '@volar/language-server'

import { AstroFormVirtualCode } from '../../core/index'
import { isInsideFrontmatter, textSelectionOnOffset } from '../utils'
import { AstroFormFieldDirectives, AstroFormFieldTagNames } from '../../utils/constant'

import { getSnippetCompletions } from './snippets'

export const create = (): LanguageServicePlugin => {
  return {
    capabilities: {
      completionProvider: {
        triggerCharacters: ['interface'],
      },
      definitionProvider: true,
    },
    create(context): LanguageServicePluginInstance {
      return {
        isAdditionalCompletion: true,
        // Q: Why the empty transform and resolve functions?
        // A: Volar will skip mapping the completion items if those functions are defined, as such we can return the snippets
        // completions as-is, this is notably useful for snippets that insert to the frontmatter, since we don't need to map anything.
        transformCompletionItem(item) {
          return item
        },
        provideCompletionItems(document, position, completionContext, token) {
          if (!context || token.isCancellationRequested || completionContext.triggerKind === 2) return null
          const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
          const sourceScript = decoded && context.language.scripts.get(decoded[0])
          const root = sourceScript?.generated?.root
          if (!(root instanceof AstroFormVirtualCode)) return undefined

          if (!isInsideFrontmatter(document.offsetAt(position), root.astroMeta.frontmatter)) return null
          const completionList: CompletionList = {
            items: [],
            isIncomplete: false,
          }
          completionList.items.push(...getSnippetCompletions(root.astroMeta.frontmatter))
          return completionList
        },
        resolveCompletionItem(item) {
          return item
        },
        provideDefinition(document, position, token) {
          // 单独支持 AstroForm directives 的 Go To Definition 能力。ts 默认会忽略 jsx 中 a:b="c" 这种类型的 attribute 类型跳转。
          if (!context || token.isCancellationRequested) return null
          const decoded = context.decodeEmbeddedDocumentUri(URI.parse(document.uri))
          const sourceScript = decoded && context.language.scripts.get(decoded[0])
          const root = sourceScript?.generated?.root
          if (!(root instanceof AstroFormVirtualCode)) return undefined
          const { frontmatter } = root.astroMeta
          if (isInsideFrontmatter(document.offsetAt(position), frontmatter)) return null
          const frontmatterOffset = frontmatter.status === 'closed' ? frontmatter.position.end.offset : 0
          const target = root.htmlDocument.findNodeAt(document.offsetAt(position) + frontmatterOffset)
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
