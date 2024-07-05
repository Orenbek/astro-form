import * as changeCase from 'change-case-all'
import type { ElementNode, Node } from '@astrojs/compiler/types'
import { is } from '@astrojs/compiler/utils'

import { SourceMap } from '../shared/source-map'
import { TransformOptions } from '..'

import { print } from './index'

function genSlotName(name: string) {
  return `$${changeCase.camelCase(`slot-${name}`)}`
}
export function printSlotElement(node: ElementNode, opts: TransformOptions): SourceMap {
  const slotNode = new SourceMap()
  const slotNameAttribute = node.attributes.find((i) => i.name === 'name')
  const refAttri = node.attributes.find((i) => i.name === 'x:ref')
  const nodeName = (() => {
    if (!slotNameAttribute) {
      return `$$props.children`
    }
    if (slotNameAttribute.kind !== 'quoted') {
      throw new Error(`[astro-form-compiler] slot name must be a string`)
    }
    return `$$props.${genSlotName(slotNameAttribute.value)}`
  })()
  slotNode.add(refAttri ? `{$$passRefToChild(${nodeName}, ${refAttri.value})}` : `{${nodeName}}`)
  return slotNode
}

export function printElementWithSlotAttribute(nodes: Node[], opts: TransformOptions): [SourceMap, Node[]] {
  const elementNode = new SourceMap()
  const normalChild: Node[] = []
  // 把 slot node 过滤出来
  const appendedSlotNames: string[] = []
  nodes.forEach((node) => {
    if (is.tag(node) && node.attributes.some((a) => a.name === 'slot')) {
      const slotAttr = node.attributes.find((a) => a.name === 'slot')!
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
      node.attributes = node.attributes.filter((a) => a.name !== 'slot')
      elementNode.add(
        ` ${slotName}=${node.name === 'slot' ? '' : '{'}`,
        print(node, opts),
        node.name === 'slot' ? '' : '}' // ?? 这里需要注解
      )
    } else {
      normalChild.push(node)
    }
  })
  return [elementNode, normalChild]
}
