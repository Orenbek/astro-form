const ImportStatementRegx =
  /import(?:(?:(?:[ \n\t]+([^ *\n\t{},]+)[ \n\t]*(?:,|[ \n\t]+))?([ \n\t]*\{(?:[ \n\t]*[^ \n\t"'{}]+[ \n\t]*,?)+\})?[ \n\t]*)|[ \n\t]*\*[ \n\t]*as[ \n\t]+([^ \n\t{}]+)[ \n\t]+)from[ \n\t]*(?:['"])([^'"\n]+)(['"])/gm
const SimpleImportStatementRegx = /import[ \t]*(?:['"])([^'"\n]+)(['"])/g
const CommentRegx = /^[ \n\t]*\/\/(?!\/ <reference).*/gm

export function printFrotmatter(_frontmatter: string) {
  const frontmatter = _frontmatter.replace(CommentRegx, '')
  const import1 = frontmatter.match(ImportStatementRegx)
  const import2 = frontmatter.match(SimpleImportStatementRegx)
  let regularStatement = frontmatter.replace(ImportStatementRegx, '')
  regularStatement = regularStatement.replace(SimpleImportStatementRegx, '')
  return [`${import1 ? import1.join('\n') : ''}\n${import2 ? import2.join('\n') : ''}`, regularStatement]
}
