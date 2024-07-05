/* eslint-disable no-fallthrough */
/* eslint-disable no-restricted-syntax */
import { parse } from '@astrojs/compiler/sync'

import { TransformResult } from '@/shared/types'
import { DiagnosticCode } from '@/shared/const'

import { doPrint } from './printer/index'

export type { TransformResult }

export interface TransformOptions {
  source: string
  filename: string
  isLanguageServer?: boolean
}

export function transform(opts: TransformOptions): TransformResult {
  const result = parse(opts.source, { position: true })
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
    }
  }
  const output = doPrint(result.ast, opts)
  const codeWithSourceMap = output.toStringWithSourceMap()
  return {
    code: codeWithSourceMap.code,
    map: codeWithSourceMap.map.toJSON() as TransformResult['map'],
    diagnostics: result.diagnostics,
    ...(opts.isLanguageServer ? { mappings: output.getMapping()[0] } : {}),
  }
}
