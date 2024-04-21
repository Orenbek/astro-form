import { isObj } from '@astro-form/shared'

import type { JSXComponent, FormPathPattern, IFieldProps } from '../types'

import { Field } from './Field'
import type { Form } from './Form'

export class ObjectField<Component extends JSXComponent = any, ValueType extends object = object> extends Field<
  Component,
  ValueType
> {
  displayName = 'ObjectField'

  constructor(path: FormPathPattern, props: IFieldProps<Component>, form: Form) {
    const v = form.getValuesIn(path)
    const initialV = form.getInitialValuesIn(path)
    const value = (() => {
      if (isObj(props.value)) return props.value
      if (isObj(v)) return v
      if (isObj(props.initialValue)) return props.initialValue
      if (isObj(initialV)) return initialV
      return {}
    })()
    const initialValue = (() => {
      if (isObj(props.initialValue)) return props.initialValue
      if (isObj(initialV)) return initialV
      return {}
    })()
    super(
      path,
      {
        ...props,
        value: value as any,
        initialValue: initialValue as any,
      },
      form
    )
  }
}
