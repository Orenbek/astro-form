import { Form, Field, ArrayField, ObjectField, Query } from '@/models'
import { GeneralField, JSXComponent } from '@/types'

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

export const isGeneralField = (node: any): node is GeneralField => {
  return node instanceof Field || node instanceof ArrayField || node instanceof ObjectField
}

export const isQuery = (query: any): query is Query => {
  return query && query instanceof Query
}
