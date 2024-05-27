import { DiagnosticMessage } from '@astrojs/compiler/types'

export interface TransformResult {
  code: string
  map: string
  diagnostics: DiagnosticMessage[]
}
