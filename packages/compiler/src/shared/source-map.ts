import { SourceNode } from 'source-map'

export interface Mapping {
  sourceOffset: number
  generatedOffset: number
  length: number
  generatedLength: number
}

export class SourceMap {
  node: SourceNode

  children: Array<SourceMap | string> = []

  constructor(
    private map?: {
      filename: string
      /** 1 based */
      line: number
      /** 1 based */
      column: number
      target: string
      source: string
      sourceOffset: number
    }
  ) {
    this.node = new SourceNode()
    if (map) {
      const codes = map.target.split('\n')
      codes.forEach((it, index) => {
        const suffix = index + 1 < codes.length ? '\n' : ''
        if (!it) {
          this.node.add(suffix)
        } else {
          this.node.add(new SourceNode(map.line + index, index === 0 ? map.column - 1 : 0, map.filename, it + suffix))
        }
      })
    }
  }

  add(...codes: Array<string | SourceMap>) {
    this.children.push(...codes)
    codes.forEach((code) => {
      this.node.add(typeof code === 'string' ? code : code.node)
    })
  }

  prepend(...codes: Array<string | SourceMap>) {
    this.children.unshift(...codes)
    codes.reverse().forEach((code) => {
      this.node.prepend(typeof code === 'string' ? code : code.node)
    })
  }

  toStringWithSourceMap() {
    return this.node.toStringWithSourceMap()
  }

  toString() {
    return this.node.toString()
  }

  getMapping(offset: number = 0): [Mapping[], number] {
    let _offset = offset
    const mapping: Mapping[] = []
    if (this.map) {
      mapping.push({
        length: this.map.source.length,
        sourceOffset: this.map.sourceOffset,
        generatedLength: this.map.target.length,
        generatedOffset: _offset,
      })
      _offset += this.map.target.length
    }
    this.children.forEach((child) => {
      if (typeof child === 'string') {
        _offset += child.length
      } else {
        const [childMapping, newOffset] = child.getMapping(_offset)
        _offset = newOffset
        mapping.push(...childMapping)
      }
    })
    return [mapping, _offset]
  }
}
