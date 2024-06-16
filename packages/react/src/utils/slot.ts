import * as changeCase from 'change-case-all'

/** 判断是否有注入 slot node */
export function hasSlotProp(name: string, props: Record<string | number | symbol, any>) {
  const slotPropsName = `$${changeCase.camelCase(`slot-${name}`)}`
  if (slotPropsName in props && props[slotPropsName] !== undefined) {
    return true
  }
  return false
}

export function getFormProps(props: Record<string | number | symbol, any>): any {
  return Object.entries(props).reduce((acc, [k, v]) => {
    if (k.startsWith('$slot')) {
      return acc
    }
    Object.assign(acc, { [k]: v })
    return acc
  }, {})
}
