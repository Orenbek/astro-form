import { SourceNode } from 'source-map'
import type { Point } from '@astrojs/compiler/types'

export class SourceMap {
  node = new SourceNode()

  constructor(private filename: string) {}

  add(code: string, point?: Point) {
    if (!point) {
      this.node.add(code)
    } else {
      const codes = code.split('\n')
      codes.forEach((it, index) => {
        const suffix = index + 1 < codes.length ? '\n' : ''
        if (!it) {
          this.node.add(suffix)
        } else {
          this.node.add(
            new SourceNode(point.line + index, index === 0 ? point.column - 1 : 0, this.filename, it + suffix)
          )
        }
      })
    }
  }

  prepend(code: string, point?: Point) {
    if (!point) {
      this.node.prepend(code)
    } else {
      const codes = code.split('\n')
      codes.reverse().forEach((it, index) => {
        const prefix = index + 1 < codes.length ? '\n' : ''
        if (!it) {
          this.node.prepend(prefix)
        } else {
          this.node.prepend(
            new SourceNode(
              point.line + codes.length - index - 1,
              index === codes.length - 1 ? point.column - 1 : 0,
              this.filename,
              prefix + it
            )
          )
        }
      })
    }
  }

  toStringWithSourceMap() {
    return this.node.toStringWithSourceMap()
  }

  toString() {
    return this.node.toString()
  }
}
