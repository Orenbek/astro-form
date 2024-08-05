import { parse } from '@astro-form/compiler'
import type { Parser, Printer, SupportLanguage } from 'prettier'
import * as prettierPluginBabel from 'prettier/plugins/babel'

import { options } from './options'
import { print } from './printer'
import { embed } from './printer/embed'
import { GlobalExpressionNode } from './printer/nodes'

const babelParser = prettierPluginBabel.parsers['babel-ts']

// https://prettier.io/docs/en/plugins.html#languages
export const languages: Partial<SupportLanguage>[] = [
  {
    name: 'astro-form',
    parsers: ['astro-form'],
    extensions: ['.aform'],
    vscodeLanguageIds: ['astro-form'],
  },
]

// https://prettier.io/docs/en/plugins.html#parsers
export const parsers: Record<string, Parser> = {
  'astro-form': {
    parse: (source) => {
      // 单独处理 globalExpression 部分 ast
      const parsedContent = parse(source)
      const sources = source.split('\n')
      const frontmatterStartLine = sources.findIndex((v) => v.startsWith('---'))
      const { globalExpression } = parsedContent
      if (globalExpression.trim().length !== 0 && frontmatterStartLine !== -1) {
        if (parsedContent.ast.children[0].type === 'frontmatter') {
          parsedContent.ast.children[0].position!.start.line = frontmatterStartLine + 1
          parsedContent.ast.children[0].position!.start.offset = parsedContent.globalExpression.length + 1
        }
        parsedContent.ast.children.unshift({
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          type: 'global-expression',
          value: parsedContent.globalExpression,
          position: {
            start: {
              line: 1,
              column: 1,
              offset: 0,
            },
            end: {
              line: frontmatterStartLine,
              column: 1,
              offset: parsedContent.globalExpression.length,
            },
          },
        } satisfies GlobalExpressionNode)
      }
      return parsedContent.ast
    },
    astFormat: 'astro-form',
    locStart: (node) => node.position.start.offset,
    locEnd: (node) => node.position.end.offset,
  },
  astroExpressionParser: {
    ...babelParser,
    preprocess(text) {
      // note the trailing newline: if the statement ends in a // comment,
      // we can't add the closing bracket right afterwards
      return `<>{${text}\n}</>`
    },
    parse(text, opts) {
      const ast = babelParser.parse(text, opts)

      return {
        ...ast,
        program: ast.program.body[0].expression.children[0].expression,
      }
    },
  },
}

// https://prettier.io/docs/en/plugins.html#printers
export const printers: Record<string, Printer> = {
  'astro-form': {
    print,
    embed,
  },
}

const defaultOptions = {
  tabWidth: 2,
}

export { defaultOptions, options }
