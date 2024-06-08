import type { IFieldFactoryProps } from '@astro-form/core'

import type { FieldProps } from '../types'

export function extractFieldPropsAndComponentProps(
  props: FieldProps
): [
  IFieldFactoryProps<any> & Pick<FieldProps, 'name' | 'as' | '$$valueType' | '$$ref'>,
  Record<string | number | symbol, any>,
] {
  return Object.entries(props).reduce<ReturnType<typeof extractFieldPropsAndComponentProps>>(
    (acc, [key, val]) => {
      if (key.startsWith('$$')) {
        if (key === '$$valueType' || key === '$$ref') {
          acc[0][key] = val
        } else {
          Object.assign(acc[0], { [key.slice(2)]: val })
        }
      } else if (key === 'name' || key === 'as') {
        acc[0][key] = val
      } else {
        Object.assign(acc[1], { [key]: val })
      }
      return acc
    },
    [{} as any, {}]
  )
}
