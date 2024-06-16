import { type CompletionItem, CompletionItemKind } from '@volar/language-server'

import type { FrontmatterStatus } from '../../core/parseAstroForm'

export function getSnippetCompletions(frontmatter: FrontmatterStatus): CompletionItem[] {
  if (frontmatter.status === 'doesnt-exist') return []

  return [
    {
      label: 'interface Props',
      kind: CompletionItemKind.Snippet,
      labelDetails: { description: 'Create a new interface to type your props' },
      documentation: {
        kind: 'markdown',
        value: ['Create a new interface to type your props.', '\n', '[AstroForm reference](https://TODO)'].join('\n'),
      },
      insertTextFormat: 2,
      filterText: 'interface props',
      insertText: 'interface Props {\n\t$1\n}',
    },
  ]
}
