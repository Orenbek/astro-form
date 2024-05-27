import { ValueType } from '../types'

export function isNormalField(valType: ValueType): valType is ValueType.String | ValueType.Number | ValueType.Boolean {
  return [ValueType.String, ValueType.Number, ValueType.Boolean].includes(valType)
}
