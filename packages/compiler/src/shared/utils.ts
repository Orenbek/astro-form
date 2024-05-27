/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
import type { Node, ParentNode } from '@astrojs/compiler/types'
import { is } from '@astrojs/compiler/utils'

export interface Visitor {
  (node: Node, parent?: ParentNode, index?: number): void
}
class Walker {
  constructor(private callback: Visitor) {}

  visit(node: Node, parent?: ParentNode, index?: number): void {
    this.callback(node, parent, index)
    if (is.parent(node)) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        this.visit(child, node as ParentNode, i)
      }
    }
  }
}

export function walk(node: ParentNode, callback: Visitor): void {
  const walker = new Walker(callback)
  walker.visit(node)
}
