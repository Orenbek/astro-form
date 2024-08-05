/* eslint-disable no-fallthrough */
/* eslint-disable no-restricted-syntax */
import { parse as astroParse } from '@astrojs/compiler/sync'
import type { ParseResult as IParseResult } from '@astrojs/compiler/types'

import { TransformResult } from '@/shared/types'
import { DiagnosticCode } from '@/shared/const'

import { doPrint } from './printer/index'
import { extractGlobalExpression } from './printer/utils'

export { serialize } from '@astrojs/compiler/utils'
export type {
  AttributeNode,
  CommentNode,
  ComponentNode,
  CustomElementNode,
  DoctypeNode,
  ElementNode,
  ExpressionNode,
  FragmentNode,
  FrontmatterNode,
  Node,
  ParentLikeNode,
  RootNode,
  TagLikeNode,
  TextNode,
  Point,
  ParseResult,
  DiagnosticMessage,
  ValueNode,
} from '@astrojs/compiler/types'
export type { TransformResult }

type ParseResult = IParseResult & { globalExpression: string }

export function parse(_source: string): ParseResult {
  const [globalExpression, source] = extractGlobalExpression(_source)
  const result = astroParse(source, { position: true })
  return {
    ...result,
    globalExpression,
  }
}

export interface TransformOptions {
  source: string
  filename: string
  isLanguageServer?: boolean
}

export function transform(opts: TransformOptions): TransformResult {
  const result = parse(opts.source)
  if (
    result.diagnostics.some((diagnostic) =>
      [
        DiagnosticCode.ERROR,
        DiagnosticCode.ERROR_UNTERMINATED_JS_COMMENT,
        DiagnosticCode.ERROR_FRAGMENT_SHORTHAND_ATTRS,
        DiagnosticCode.ERROR_UNMATCHED_IMPORT,
      ].includes(diagnostic.code as any)
    )
  ) {
    return {
      code: '',
      map: {
        file: opts.filename ?? '',
        sources: [],
        sourcesContent: [],
        names: [],
        mappings: '',
        version: 0,
      },
      diagnostics: result.diagnostics,
      mappings: [],
    }
  }
  const output = doPrint(result.ast, opts, result.globalExpression)
  const codeWithSourceMap = output.toStringWithSourceMap()
  return {
    code: codeWithSourceMap.code,
    map: codeWithSourceMap.map.toJSON() as TransformResult['map'],
    diagnostics: result.diagnostics,
    ...(opts.isLanguageServer ? { mappings: output.getMapping()[0] } : {}),
  }
}
