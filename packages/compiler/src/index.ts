/* eslint-disable no-fallthrough */
/* eslint-disable no-restricted-syntax */
import changeCase from 'change-case-all'
import { parse } from '@astrojs/compiler/sync'
import type { Node, TagLikeNode } from '@astrojs/compiler/types'
import { is } from '@astrojs/compiler/utils'

import { TransformResult, ValueType } from '@/shared/types'
import { DiagnosticCode } from '@/shared/const'
import { printSlotNode, genSlotName } from '@/printer/slot'

import { printFrotmatter } from './printer/frontmatter'

export function transform(source: string, filename: string): TransformResult {
  const result = parse(source, undefined)
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
    return { code: '', map: '', diagnostics: result.diagnostics }
  }
  return { code: serialize(result.ast, { filename }), map: '', diagnostics: [] }
}

export interface SerializeOptions {
  filename: string
}

export function serialize(root: Node, opts: SerializeOptions): string {
  let output = ''
  let frontmatter = ''
  function visitor(node: Node) {
    if (is.root(node)) {
      node.children.forEach((child) => visitor(child))
    } else if (is.frontmatter(node)) {
      frontmatter += node.value
    } else if (is.expression(node)) {
      output += `{`
      node.children.forEach((child) => visitor(child))
      output += `}`
    } else if (is.literal(node)) {
      if (is.comment(node)) {
        // 注释节点不输出
        return
      }
      output += node.value
    } else if (is.tag(node)) {
      if (node.name === 'slot') {
        output += printSlotNode(node)
        return
      }
      const [elementName, valType] = getElementName(node.name)
      output += `<${elementName}`
      output += serializeAttributes(node)
      if (valType) {
        output += ` $$valueType="${valType}"`
      }
      if (node.children.length === 0) {
        output += ` />`
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
            if (appendedSlotNames.includes(slotAttr.value)) {
              throw new Error(`[astro-form-compiler] multiple slot name detected: ${slotAttr.value}`)
            }
            appendedSlotNames.push(slotAttr.value)
            // eslint-disable-next-line no-param-reassign
            child.attributes = child.attributes.filter((a) => a.name !== 'slot')
            output += ` ${genSlotName(slotAttr.value)}=${child.name === 'slot' ? '' : '{'}`
            visitor(child)
            output += `${child.name === 'slot' ? '' : '}'}`
          } else {
            normalChild.push(child)
          }
        })
        output += `>`
        normalChild.forEach((child) => visitor(child))
        output += `</${elementName}>`
      }
    }
  }
  visitor(root)
  const [importStatement, regularStatement] = printFrotmatter(frontmatter)
  output = `import * as $$React from 'react'
import { useForm as useForm$$, Field as $$Field, passRefToChild, useRef as useRef$$ } from '@astro-form/react'
${importStatement}
const $Form = {}
export default function ${changeCase.pascalCase(opts.filename)}(props) {
  const form = useForm$$()
  $Form.props = props
  $Form.form = form
  $Form.ref = useRef$$
  ${regularStatement}
  return <>
    ${output}
  </>
}`
  return output
}

function getElementName(elemName: string): [string, ValueType | undefined] {
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
    return ['$$Field', valType]
  }
  if (elemName === 'Fragment') {
    return ['$$React.Fragment', undefined]
  }
  return [elemName, undefined]
}

function getFormPropsName(name: string) {
  if (name.startsWith('x:')) {
    return `$$${changeCase.camelCase(name.slice(2))}`
  }
  return name
}

function serializeAttributes(node: TagLikeNode): string {
  let output = ''
  for (const attr of node.attributes) {
    output += ' '
    const attrName = getFormPropsName(attr.name)
    switch (attr.kind) {
      case 'empty': {
        output += `${attrName}`
        break
      }
      case 'expression': {
        output += `${attrName}={${attr.value}}`
        break
      }
      case 'quoted': {
        output += `${attrName}=${attr.raw}`
        break
      }
      case 'template-literal': {
        output += `${attrName}={\`${attr.value}\`}`
        break
      }
      case 'shorthand': {
        // don't supported
        break
      }
      case 'spread': {
        output += `{...${attr.value}}`
        break
      }
      default:
        break
    }
  }
  return output
}
