import type { IFieldFactoryProps } from '@astro-form/core'

export enum ValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}
export type FieldProps = {
  'x-valueType': ValueType
  'x-as': string | React.FC<any>
  children?: React.ReactNode | undefined
  [key: string | number | symbol]: any
} & Prettify<FieldPropsGen<Exclude<IFieldFactoryProps<any>, 'component' | 'basePath'>>>

export type IFieldProps = {
  'x-as': string | React.FC<any>
  children?: React.ReactNode | undefined
  [key: string | number | symbol]: any
} & Prettify<FieldPropsGen<Exclude<IFieldFactoryProps<any>, 'component' | 'basePath'>>>

type FieldPropsGen<T> = {
  [K in keyof T as `x-${K & string}`]: T[K]
}
type Prettify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never
