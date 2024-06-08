import changeCase from 'change-case-all'
import type { TagLikeNode } from '@astrojs/compiler/types'

function genSlotName(name: string) {
  return `$${changeCase.camelCase(`slot-${name}`)}`
}
export function printSlotNode(node: TagLikeNode) {
  const slotNameAttribute = node.attributes.find((i) => i.name === 'name')
  const refAttri = node.attributes.find((i) => i.name === 'x:ref')
  const nodeName = (() => {
    if (!slotNameAttribute) {
      return `props.children`
    }
    if (slotNameAttribute.kind !== 'quoted') {
      throw new Error(`[astro-form-compiler] slot name must be a string`)
    }
    return `props.${genSlotName(slotNameAttribute.value)}`
  })()
  if (refAttri) {
    return `{passRefToChild(${nodeName}, ${refAttri.value})}`
  }
  return `{${nodeName}}`
}
