import { DiagnosticMessage } from '@astrojs/compiler/types'

export interface TransformResult {
  code: string
  map: string
  diagnostics: DiagnosticMessage[]
}
export enum ValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}
