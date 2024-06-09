/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from 'path'

import { transform } from '@astro-form/compiler'
import * as ts from 'typescript'

type SourceMap = unknown
type CallbackType = (err: Error | null, content: string | Buffer, sourceMap?: SourceMap, meta?: any) => void

export default function loader(source: string) {
  // @ts-ignore
  const filePath = this.resourcePath as string
  const filename = path.basename(filePath).slice(0, -6)
  const { code } = transform(source, filename)
  const jsContent = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  // @ts-ignore
  ;(this.callback as CallbackType)(null, jsContent)
}
