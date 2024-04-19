import { JSXComponent } from '../types'

import { Field } from './Field'

export class ObjectField<Component extends JSXComponent = any, ValueType extends object = object> extends Field<
  Component,
  ValueType
> {
  displayName = 'ObjectField'
}
