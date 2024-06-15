import type { Position } from '@astrojs/compiler/types'

const ImportStatementRegx =
  /import(?:(?:(?:[ \n\t]+([^ *\n\t{},]+)[ \n\t]*(?:,|[ \n\t]+))?([ \n\t]*\{(?:[ \n\t]*[^ \n\t"'{}]+[ \n\t]*,?)+\})?[ \n\t]*)|[ \n\t]*\*[ \n\t]*as[ \n\t]+([^ \n\t{}]+)[ \n\t]+)from[ \n\t]*(?:['"])([^'"\n]+)(['"]);?/gm
const SimpleImportStatementRegx = /import[ \t]*(?:['"])([^'"\n]+)(['"]);?/g
const CommentRegx = /^[ \n\t]*\/\/(?!\/ <reference).*/gm

export function printFrotmatter(frontmatter: string, frontmatterStartLine: number) {
  const import1 = frontmatter.match(ImportStatementRegx)
  const import2 = frontmatter.match(SimpleImportStatementRegx)
  const importStatements: Array<{ code: string; position: Position }> = []
  let endOfImportLine = 0
  if (import1) {
    import1.forEach((it, i) => {
      const position = findStringPoint(frontmatter, it, frontmatterStartLine)
      importStatements.push({
        code: it,
        position,
      })
      if (i === import1.length - 1) {
        endOfImportLine = position.end!.line
      }
    })
  }
  if (import2) {
    import2.forEach((it, i) => {
      const position = findStringPoint(frontmatter, it, frontmatterStartLine)
      importStatements.push({
        code: it,
        position,
      })
      if (endOfImportLine && i === import2.length - 1 && position.end!.line > endOfImportLine) {
        endOfImportLine = position.end!.line
      }
    })
  }
  const regularStatement: { code: string; position: Position } = {
    code: frontmatter
      .split('\n')
      .slice(endOfImportLine - 1 - frontmatterStartLine)
      .join('\n'),
    position: {
      start: {
        line: endOfImportLine,
        column: 1,
        offset: -1,
      },
    },
  }

  return [importStatements, regularStatement] as const
}

function findStringPoint(originStr: string, targetStr: string, frontmatterStartLine: number): Position {
  const rows = originStr.slice(0, originStr.indexOf(targetStr)).split('\n')
  return {
    start: {
      line: rows.length,
      column: rows[rows.length - 1].length + 1,
      offset: -1,
    },
    end: {
      line: rows.length + targetStr.split('\n').length + frontmatterStartLine,
      column: 1,
      offset: -1,
    },
  }
}
