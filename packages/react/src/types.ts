import type { Field, IFieldFactoryProps } from '@astro-form/core'
import type { IObservableValue } from 'mobx'

export enum ValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}
export type FieldProps = {
  name: string
  as?: string | React.FC<any>
  $$valueType: ValueType
  $$ref?: IObservableValue<Field | null> | Array<IObservableValue<Field | null>>
  children?: React.ReactNode | undefined
  [key: string | number | symbol]: any
} & Prettify<AppendPrefix<Exclude<IFieldFactoryProps<any>, 'component' | 'basePath'>>>

/**
 * <Item><f.string name="test" x:ref={ref} /></Item>
 * ------ Item component -----
 * <div><f.slot x:ref={ref} /></div>
 *
 * 上面这种情况下 应该传给组件两个ref
 */

export type IFieldProps = Omit<FieldProps, '$$valueType'>

type AppendPrefix<T> = {
  [K in keyof T as `$$${K & string}`]: T[K]
}
type Prettify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never
