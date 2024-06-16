import type { CompletionList, LanguageServicePlugin, LanguageServicePluginInstance } from '@volar/language-server'
import { URI } from 'vscode-uri'

import { AstroFormVirtualCode } from '../../core/index'
import { isInsideFrontmatter } from '../utils'

import { getSnippetCompletions } from './snippets'

export const create = (): LanguageServicePlugin => {
  return {
    capabilities: {},
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
      }
    },
  }
}
