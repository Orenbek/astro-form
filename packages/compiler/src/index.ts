/* eslint-disable no-fallthrough */
/* eslint-disable no-restricted-syntax */
import path from 'node:path'

import * as changeCase from 'change-case-all'
import { parse } from '@astrojs/compiler/sync'
import type { Node, TagLikeNode } from '@astrojs/compiler/types'
import { is } from '@astrojs/compiler/utils'

import { TransformResult, ValueType } from '@/shared/types'
import { DiagnosticCode } from '@/shared/const'
import { printSlotNode, genSlotName } from '@/printer/slot'

import { printFrotmatter } from './printer/frontmatter'
import { SourceMap } from './shared/source-map'

export type { TransformResult }

export function transform(source: string, filename: string): TransformResult {
  const result = parse(source, { position: true })
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
        file: filename ?? '',
        sources: [],
        sourcesContent: [],
        names: [],
        mappings: '',
        version: 0,
      },
      diagnostics: result.diagnostics,
    }
  }
  const output = serialize(result.ast, { filename, source }).toStringWithSourceMap()
  return {
    code: output.code,
    map: output.map.toJSON() as TransformResult['map'],
    diagnostics: result.diagnostics,
  }
}

interface SerializeOptions {
  filename: string
  source: string
}

function serialize(root: Node, opts: SerializeOptions): SourceMap {
  const output = new SourceMap(opts.filename)
  let frontmatter = ''
  function visitor(node: Node) {
    if (is.root(node)) {
      node.children.forEach((child) => visitor(child))
    } else if (is.frontmatter(node)) {
      frontmatter += node.value
    } else if (is.expression(node)) {
      output.add(`{`)
      node.children.forEach((child) => visitor(child))
      output.add(`}`)
    } else if (is.literal(node)) {
      if (is.comment(node)) {
        // 注释节点不输出
        return
      }
      output.add(node.value, node.position?.start)
    } else if (is.tag(node)) {
      if (node.name === 'slot') {
        output.add(printSlotNode(node))
        return
      }
      const elementName = getElementName(node.name)
      output.add(`<${elementName}`, node.position?.start)
      serializeAttributes(node, output)
      if (node.children.length === 0) {
        output.add(` />`)
      } else {
        const normalChild: Node[] = []
        // 把 slot node 过滤出来
        const appendedSlotNames: string[] = []
        node.children.forEach((child) => {
          if (is.tag(child) && child.attributes.some((a) => a.name === 'slot')) {
            const slotAttr = child.attributes.find((a) => a.name === 'slot')!
            if (slotAttr.kind !== 'quoted') {
              throw new Error(`[astro-form-compiler] slot value must be a string`)
            }
            const slotName = genSlotName(slotAttr.value)
            if (appendedSlotNames.includes(slotName)) {
              throw new Error(
                `[astro-form-compiler] multiple slot name detected: ${slotAttr.value}. Please pass in a unique kebab-case string`
              )
            }
            appendedSlotNames.push(slotName)
            // eslint-disable-next-line no-param-reassign
            child.attributes = child.attributes.filter((a) => a.name !== 'slot')
            output.add(` ${slotName}=${child.name === 'slot' ? '' : '{'}`)
            visitor(child)
            output.add(child.name === 'slot' ? '' : '}')
          } else {
            normalChild.push(child)
          }
        })
        output.add(`>`)
        normalChild.forEach((child) => visitor(child))
        output.add(`</${elementName}>`)
      }
    }
  }
  visitor(root)

  const frontmatterStartLine = opts.source.split('\n').findIndex((v) => v.startsWith('---'))
  const [importStatements, regularStatement] = printFrotmatter(frontmatter, frontmatterStartLine)
  output.add(`\n  </>\n})`)
  output.prepend(`  return <>\n  `)
  output.prepend(regularStatement.code, regularStatement.position.start)
  const basename = path.basename(opts.filename, path.extname(opts.filename))
  output.prepend(`
export default $$observer(function ${changeCase.pascalCase(basename)}($$props) {
  interface Props {}
  /**
   * AstroForm global available in all contexts in .aform files
   *
   * [AstroForm documentation](https://todo)
  */
  const Form: Readonly<AstroFormGlobal<Props>> = {props:$$getFormProps($$props),ref:useRef$$,slots:{has:$$hasSlotProp}} as any
  Form.form = useForm$$()\n`)
  importStatements.reverse().forEach((it) => {
    output.prepend(`${it.code}\n`, it.position.start)
  })
  output.prepend(`import * as $$React from 'react'
import {useForm as useForm$$, f as $$Field, useRef as useRef$$, observer as $$observer, AstroFormGlobal, passRefToChild as $$passRefToChild, hasSlotProp as $$hasSlotProp,getFormProps as $$getFormProps} from '@astro-form/react'\n`)
  return output
}

function getElementName(elemName: string): string {
  if (elemName.startsWith('f.')) {
    let valType: ValueType
    switch (elemName) {
      case 'f.string':
        valType = ValueType.String
        break
      case 'f.number':
        valType = ValueType.Number
        break
      case 'f.boolean':
        valType = ValueType.Boolean
        break
      case 'f.object':
        valType = ValueType.Object
        break
      case 'f.array':
        valType = ValueType.Array
        break
      default:
        throw new Error(`[astro-form-compiler] unknown field type: ${elemName}`)
    }
    return `$$Field.${valType}`
  }
  if (elemName === 'Fragment') {
    return '$$React.Fragment'
  }
  return elemName
}

function getFormPropsName(name: string) {
  if (name.startsWith('x:')) {
    return `$$${changeCase.camelCase(name.slice(2))}`
  }
  return name
}

function serializeAttributes(node: TagLikeNode, output: SourceMap) {
  for (const attr of node.attributes) {
    output.add(' ')
    const attrName = getFormPropsName(attr.name)
    switch (attr.kind) {
      case 'empty': {
        output.add(`${attrName}`, attr.position?.start)
        break
      }
      case 'expression': {
        output.add(`${attrName}={${attr.value}}`, attr.position?.start)
        break
      }
      case 'quoted': {
        output.add(`${attrName}=${attr.raw}`, attr.position?.start)
        break
      }
      case 'template-literal': {
        output.add(`${attrName}={\`${attr.value}\`}`, attr.position?.start)
        break
      }
      case 'shorthand': {
        // don't supported
        break
      }
      case 'spread': {
        output.add(`{...${attr.value}}`, attr.position?.start)
        break
      }
      default:
        break
    }
  }
}
