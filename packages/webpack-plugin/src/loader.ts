/* eslint-disable @typescript-eslint/ban-ts-comment */
import { transform } from '@astro-form/compiler'
import * as ts from 'typescript'

type SourceMap = unknown
type CallbackType = (err: Error | null, content: string | Buffer, sourceMap?: SourceMap, meta?: any) => void
type OptionType = { filename: string }

export default function loader(source: string) {
  // @ts-ignore
  const options = this.getOptions() as OptionType
  const { code } = transform(source, options.filename)
  const jsContent = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  // @ts-ignore
  ;(this.callback as CallbackType)(null, jsContent)
}
