/// <reference lib="dom" />
import type React from 'react'
import type {
  Field,
  FieldDataSource,
  FieldValidator,
  FieldDisplayTypes,
  FieldPatternTypes,
  FieldReaction,
} from '@astro-form/core'
import type { IObservableValue } from 'mobx'

export declare namespace astroformHTML.JSX {
  interface IntrinsicAttributes {
    slot?: string
  }
}

type FieldPorps<T extends string | React.FC<any>> = {
  name: string
  as?: T
  children?: React.ReactNode | undefined
  'x:ref'?: IObservableValue<Field | null>
  'x:initialValue'?: any
  'x:display'?: FieldDisplayTypes
  'x:pattern'?: FieldPatternTypes
  'x:hidden'?: boolean
  'x:visible'?: boolean
  'x:editable'?: boolean
  'x:disabled'?: boolean
  'x:readPretty'?: boolean
  'x:dataSource'?: FieldDataSource
  'x:validator'?: FieldValidator
  'x:data'?: any
  'x:validateFirst'?: boolean
  'x:reactions'?: FieldReaction[] | FieldReaction
} & (T extends string ? JSX.IntrinsicAttributes : Parameters<T>[0])

export declare const f: {
  string<T extends string | React.FC<any>>(props: FieldPorps<T>): React.ReactElement<any, any> | null
  number<T extends string | React.FC<any>>(props: FieldPorps<T>): React.ReactElement<any, any> | null
  boolean<T extends string | React.FC<any>>(props: FieldPorps<T>): React.ReactElement<any, any> | null
  object<T extends string | React.FC<any>>(props: FieldPorps<T>): React.ReactElement<any, any> | null
  array<T extends string | React.FC<any>>(props: FieldPorps<T>): React.ReactElement<any, any> | null
}
export import JSX = astroformHTML.JSX
