/* eslint-disable no-restricted-syntax */
import * as changeCase from 'change-case'
import { parse } from '@astrojs/compiler/sync'
import type { Node, TagLikeNode } from '@astrojs/compiler/types'
import { is } from '@astrojs/compiler/utils'

import { TransformResult } from '@/shared/types'
import { DiagnosticCode } from '@/shared/const'

export function transform(source: string): TransformResult {
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
  return { code: serialize(result.ast, { filename: '' }), map: '', diagnostics: [] }
}

export interface SerializeOptions {
  selfClose?: boolean
  filename: string
}

export function serialize(root: Node, opts: SerializeOptions): string {
  let output = ''
  let frontmatter = ''
  const selfClose = opts.selfClose ?? true
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
      output += node.value
    } else if (is.tag(node)) {
      if (node.name === 'slot') {
        output += serializeSlot(node)
        return
      }

      output += `<${node.name}`
      output += serializeAttributes(node)
      if (node.children.length === 0 && selfClose) {
        output += ` />`
      } else {
        const normalChild: Node[] = []
        node.children.forEach((child) => {
          if (is.tag(child) && child.attributes.some((a) => a.name === 'slot')) {
            const slotAttr = child.attributes.find((a) => a.name === 'slot')!
            if (slotAttr.kind !== 'quoted') {
              throw new Error(`[astro-form-compiler] slot value must be a string`)
            }
            output += ` ${genSlotName(slotAttr.value)}=${child.name === 'slot' ? '' : '{'}`
            visitor(child)
            output += `${child.name === 'slot' ? '' : '}'}`
          } else {
            normalChild.push(child)
          }
        })
        output += `>`
        normalChild.forEach((child) => visitor(child))
        output += `</${node.name}>`
      }
    }
  }
  visitor(root)
  output = `import {} from '@astro-form/react'

  export default function ${changeCase.pascalCase(opts.filename)}(props) {
  $Form.props = props
  ${frontmatter}
  return <>
    ${output}
  </>
}`
  return output
}

function genSlotName(name: string) {
  return `$${changeCase.camelCase(`slot-${name}`)}`
}
function serializeSlot(node: TagLikeNode) {
  const slotNameAttribute = node.attributes.find((i) => i.name === 'name')
  if (!slotNameAttribute) {
    return `{children}`
  }
  if (slotNameAttribute.kind !== 'quoted') {
    throw new Error(`[astro-form-compiler] slot name must be a string`)
  }
  return `{${genSlotName(slotNameAttribute.value)}}`
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
