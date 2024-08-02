import * as changeCase from 'change-case-all'

import { ValueType } from '@/shared/types'

export function getElementName(elemName: string, isLanguageServer?: boolean): string {
  if (!isLanguageServer && elemName.startsWith('f.')) {
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

export function getFormPropsName(name: string, isLanguageServer?: boolean) {
  if (!isLanguageServer && name.startsWith('x:')) {
    return `$$${changeCase.camelCase(name.slice(2))}`
  }
  return name
}

const ImportStatementRegx =
  /import(?:(?:(?:[ \n\t]+([^ *\n\t{},]+)[ \n\t]*(?:,|[ \n\t]+))?([ \n\t]*\{(?:[ \n\t]*[^ \n\t"'{}]+[ \n\t]*,?)+\})?[ \n\t]*)|[ \n\t]*\*[ \n\t]*as[ \n\t]+([^ \n\t{}]+)[ \n\t]+)from[ \n\t]*(?:['"])([^'"\n]+)(['"]);?/gm
const SimpleImportStatementRegx = /import[ \t]*(?:['"])([^'"\n]+)(['"]);?/g
const CommentRegx = /^[ \n\t]*\/\/(?!\/ <reference).*/gm

function splitFrontMatterIntoGlobalStatementAndComponentExpression(frontmatter: string, source: string) {
  /** 在目前的设计中 frontmatter 只有一个，无法得知哪些 expression 应该放在组件内 哪些是在组件外。 */
  /**
   * 例如：
   * ---
   * import 'xx'
   * import 'xx2'
   * statement1
   * statement2
   * ...
   * ---
   * 目前做法是将 frontmatter 一分为二， statement1 开始的所有 expression 放在函数组件内，剩余的放在全局。
   */
  /**
   * 这种操作显然是比较 hack 的。其实最佳解决办法是设计两个 frontmatter，一个是 global frontmatter，另外一个是 component level frontmatter。
   * 但这种设计会增加一些开发成本，后续考虑加入这feature。
   */
  // frontmatter 的 startLine 计算有错误，得加上空行
  const import1 = [...frontmatter.matchAll(ImportStatementRegx)]
  const import2 = [...frontmatter.matchAll(SimpleImportStatementRegx)]
  let index = 0
  if (import1.length > 0) {
    index = import1[import1.length - 1].index! + import1[import1.length - 1][0].length
  } else if (import2.length > 0) {
    index = Math.max(index, import2[import2.length - 1].index! + import2[import2.length - 1][0].length)
  }
  const globalStatement = frontmatter.slice(0, index)
  // 额外删掉一个 \n
  const componentStatement = frontmatter.slice(index + 1)

  const sources = source.split('\n')
  const frontmatterStartLine = sources.findIndex((v) => v.startsWith('---'))
  const offset = sources.slice(0, frontmatterStartLine).join('\n').length + 3
  const gsWithPosition = {
    code: globalStatement,
    line: frontmatterStartLine + 1,
    column: 4,
    offset,
  }
  const csWithPosition = {
    code: componentStatement,
    line: frontmatterStartLine + 1 + globalStatement.split('\n').length,
    column: 1,
    offset: offset + globalStatement.length + 1,
  }
  return [gsWithPosition, csWithPosition] as const
}

export function getFrontmatterPosition(source: string) {
  const sources = source.split('\n')
  const frontmatterStartLine = sources.findIndex((v) => v.startsWith('---'))
  const globalFrontmatter = sources.slice(0, frontmatterStartLine).join('\n')
  return {
    line: frontmatterStartLine + 1,
    column: 4,
    offset: globalFrontmatter.length + 3,
  } as const
}

export function extractGlobalExpression(source: string) {
  const sources = source.split('\n')
  const frontmatterStartLine = sources.findIndex((v) => v.startsWith('---'))
  if (frontmatterStartLine === -1) {
    return ['', source]
  }
  const globalFrontmatter = sources.slice(0, frontmatterStartLine)
  return [
    globalFrontmatter.join('\n'),
    [...globalFrontmatter.map((v) => ' '.repeat(v.length)), ...sources.slice(frontmatterStartLine)].join('\n'),
  ]
}
