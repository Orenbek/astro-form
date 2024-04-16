import { Form, Field, ArrayField, ObjectField } from '@/models'
import { JSXComponent } from '@/types'

export const isForm = (node: any): node is Form => {
  return node instanceof Form
}

export const isField = <Component extends JSXComponent = any, ValueType = any>(
  node: any
): node is Field<Component, ValueType> => {
  return node instanceof Field
}

export const isArrayField = <Component extends JSXComponent = any, ValueType extends any[] = any[]>(
  node: any
): node is ArrayField<Component, ValueType> => {
  return node instanceof ArrayField
}

export const isObjectField = <Component extends JSXComponent = any, ValueType extends object = object>(
  node: any
): node is ObjectField<Component, ValueType> => {
  return node instanceof ObjectField
}
