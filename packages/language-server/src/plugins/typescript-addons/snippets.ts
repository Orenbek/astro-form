import { type CompletionItem, CompletionItemKind } from '@volar/language-server'

export function getSnippetCompletions(): CompletionItem[] {
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
