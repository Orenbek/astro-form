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
    super(
      path,
      {
        ...props,
        value: (isObj(props.value) ? props.value : isObj(props.initialValue) ? props.initialValue : {}) as any,
        initialValue: (isObj(props.initialValue) ? props.initialValue : {}) as any,
      },
      form
    )
  }
}
