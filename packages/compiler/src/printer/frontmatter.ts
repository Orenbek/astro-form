const ImportStatementRegx =
  /import(?:(?:(?:[ \n\t]+([^ *\n\t{},]+)[ \n\t]*(?:,|[ \n\t]+))?([ \n\t]*\{(?:[ \n\t]*[^ \n\t"'{}]+[ \n\t]*,?)+\})?[ \n\t]*)|[ \n\t]*\*[ \n\t]*as[ \n\t]+([^ \n\t{}]+)[ \n\t]+)from[ \n\t]*(?:['"])([^'"\n]+)(['"])/gm
const SimpleImportStatementRegx = /import[ \t]*(?:['"])([^'"\n]+)(['"])/g

export function printFrotmatter(frontmatter: string) {
  const import1 = frontmatter.match(ImportStatementRegx)
  const import2 = frontmatter.match(SimpleImportStatementRegx)
  let regularStatement = frontmatter
  if (import1) {
    import1.forEach((it) => {
      regularStatement = regularStatement.replace(it, '')
    })
  }
  if (import2) {
    import2.forEach((it) => {
      regularStatement = regularStatement.replace(it, '')
    })
  }
  return [`${import1 ? import1.join('\n') : ''}\n${import2 ? import2.join('\n') : ''}`, regularStatement]
}
