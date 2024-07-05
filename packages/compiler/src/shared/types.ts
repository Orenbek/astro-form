import type { DiagnosticMessage, SourceMap } from '@astrojs/compiler/types'

import type { Mapping } from './source-map'

export interface TransformResult {
  code: string
  map: SourceMap
  diagnostics: DiagnosticMessage[]
  mappings?: Mapping[]
}
export enum ValueType {
  String = 'String',
  Number = 'Number',
  Boolean = 'Boolean',
  Object = 'Object',
  Array = 'Array',
}
