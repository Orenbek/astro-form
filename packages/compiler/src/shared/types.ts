import type { DiagnosticMessage, SourceMap } from '@astrojs/compiler/types'

export interface TransformResult {
  code: string
  map: SourceMap
  diagnostics: DiagnosticMessage[]
}
export enum ValueType {
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Object = 'Object',
  Array = 'Array',
}
