import path from 'node:path'

import type { Node, FrontmatterNode } from '@astrojs/compiler/types'
import * as changeCase from 'change-case-all'

import { SourceMap } from '../shared/source-map'
import { TransformOptions } from '..'

import { print } from './index'
import { getFrontmatterPosition } from './utils'

export function printComponent(rootNode: Node, frontmatterNode: FrontmatterNode | undefined, opts: TransformOptions) {
  const componentNode = new SourceMap()
  const basename = path.basename(opts.filename, path.extname(opts.filename))
  if (opts.isLanguageServer) {
    componentNode.add(`
export default function ${changeCase.pascalCase(basename)}($$props: Props): JSX.Element {
  /**
   * AstroForm global available in all contexts in .aform files
   *
   * [AstroForm documentation](https://todo)
  */
  const Form: Readonly<AstroFormGlobal<Props>> = {} as any
    `)
  } else {
    componentNode.add(`
export default $$observer(function ${changeCase.pascalCase(basename)}($$props: Props): JSX.Element {
  const Form: Readonly<AstroFormGlobal<Props>> = {props:$$getFormProps($$props),ref:useRef$$,slots:{has:$$hasSlotProp}} as any
  Form.form = useForm$$()\n`)
  }
  if (frontmatterNode) {
    const frontmatterPos = getFrontmatterPosition(opts.source)
    componentNode.add(
      new SourceMap({
        filename: opts.filename,
        line: frontmatterPos.line,
        column: frontmatterPos.column,
        target: frontmatterNode.value,
        source: frontmatterNode.value,
        sourceOffset: frontmatterPos.offset,
      })
    )
  }
  componentNode.add(
    ` return <>
  `,
    print(rootNode, opts),
    `
  </>
}${opts.isLanguageServer ? '' : ')'}`
  )
  return componentNode
}
