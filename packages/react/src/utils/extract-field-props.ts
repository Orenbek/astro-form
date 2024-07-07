import type { IFieldFactoryProps, Field as FieldType, FieldComponent, Form } from '@astro-form/core'

import type { FieldProps } from '../types'

type IFieldProps = IFieldFactoryProps<any> & Pick<FieldProps, 'name' | 'as' | '$$valueType' | '$$ref'>

export function extractFieldPropsAndComponentProps(
  props: FieldProps
): [IFieldProps, Record<string | number | symbol, any>] {
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

export function createFieldHelper(
  props: IFieldProps,
  compoenntProps: Record<string | number | symbol, any>,
  form: Form<any>,
  basePath?: string
): FieldType | null {
  if (basePath === undefined) return null
  const { as, $$valueType: valueType, $$ref, ...rest } = props
  const fprops = { ...rest, basePath, component: [as, compoenntProps] as FieldComponent<any> }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let field: FieldType | undefined
  if (valueType === 'object') {
    field = form.createObjectField(fprops)
  } else if (valueType === 'array') {
    field = form.createArrayField(fprops)
  } else {
    field = form.createField(fprops)
  }
  if (field && !field.mounted) {
    field.onMount()
  }
  return field || null
}
