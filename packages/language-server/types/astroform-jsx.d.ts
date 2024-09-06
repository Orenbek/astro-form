/* eslint-disable @typescript-eslint/ban-types */
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

interface IObservableValue<T> {
  get(): T
  set(value: T): void
}
type ValidatorFormats =
  | 'url'
  | 'email'
  | 'ipv6'
  | 'ipv4'
  | 'number'
  | 'integer'
  | 'idcard'
  | 'qq'
  | 'phone'
  | 'money'
  | 'zh'
  | 'date'
  | 'zip'
  | (string & {})

type Prettify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never
type Elements = [
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'big',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'keygen',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'menu',
  'menuitem',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'track',
  'u',
  'ul',
  'use',
  'var',
  'video',
  'wbr',
  'circle',
  'clipPath',
  'defs',
  'ellipse',
  'foreignObject',
  'g',
  'image',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'svg',
  'text',
  'tspan',
]

type WebTarget = Elements[number] | React.ComponentType<any>

type PolymorphicComponentProps<AsTarget extends WebTarget | void> = Prettify<
  AsTarget extends Elements[number]
    ? React.ComponentPropsWithRef<AsTarget>
    : AsTarget extends React.ComponentType<infer P>
      ? P
      : {}
> & {
  name: string
  as?: AsTarget
  children?: React.ReactNode | undefined
  'x:basePath'?: string
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
  'x:reactions'?: FieldReaction[] | FieldReaction
  'x:validateFirst'?: boolean
  'v:format'?: ValidatorFormats
  'v:required'?: boolean
  'v:pattern'?: RegExp | string
  'v:max'?: number
  'v:maximum'?: number
  'v:maxItems'?: number
  'v:minItems'?: number
  'v:maxLength'?: number
  'v:minLength'?: number
  'v:exclusiveMaximum'?: number
  'v:exclusiveMinimum'?: number
  'v:minimum'?: number
  'v:min'?: number
  'v:len'?: number
  'v:whitespace'?: boolean
  'v:enum'?: any[]
  'v:const'?: any
  'v:multipleOf'?: number
  'v:uniqueItems'?: boolean
  'v:maxProperties'?: number
  'v:minProperties'?: number
}

export declare global {
  const f: {
    string<T extends WebTarget | void = void>(props: PolymorphicComponentProps<T>): React.ReactElement<any, any> | null
    number<T extends WebTarget | void = void>(props: PolymorphicComponentProps<T>): React.ReactElement<any, any> | null
    boolean<T extends WebTarget | void = void>(props: PolymorphicComponentProps<T>): React.ReactElement<any, any> | null
    object<T extends WebTarget | void = void>(props: PolymorphicComponentProps<T>): React.ReactElement<any, any> | null
    array<T extends WebTarget | void = void>(props: PolymorphicComponentProps<T>): React.ReactElement<any, any> | null
  }
}

export declare namespace astroformHTML.JSX {
  interface IntrinsicAttributes {
    slot?: string
  }
}
export import JSX = astroformHTML.JSX
