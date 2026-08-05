/** Shallow equality for plain prop bags (Object.is per key). */
export function shallowEqualRecord(
  a: Record<string | number | symbol, any> | null | undefined,
  b: Record<string | number | symbol, any> | null | undefined
): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i]
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false
    }
  }
  return true
}
