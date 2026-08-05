import type { Field, IFieldFactoryProps, Form } from '@astro-form/core'
import type { IObservableValue } from 'mobx'
import type { ValidatorFormats } from '@formily/validator'

export enum ValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}

/** Field model props accepted by `f.*` / BaseField (mirrors core factory props). */
export type FieldModelProps = Omit<IFieldFactoryProps<any>, 'component' | 'value' | 'plugins' | 'name'>

/**
 * Hand-written field props (`x-required`, `x-initialValue`, `x-ref`, …).
 *
 * ## Prefix history (keep both runtimes)
 * - `.aform` / compiler inject uses **`$$*`** / **`v$$*`** (not listed on public types).
 * - Hand-written React uses **`x-*`** / **`v-*`**. Runtime still accepts compiler prefixes so
 *   `.aform` components can coexist; we only hide `$$` / `v$$` from the **public** type surface.
 *
 * ## `x-ref` / multi-ref
 * Not a DOM ref — MobX `observable.box` filled with the core `Field` on mount.
 * May be a **single box or an array**: wrapper slots can merge refs via `passRefToChild`
 * (page `x:ref` + Item `<slot x:ref>` both need the same Field). See that util's file comment.
 */
export type HyphenFieldProps = Prettify<AppendPrefix<FieldModelProps, 'x-'>> & {
  'x-ref'?: IObservableValue<Field | null> | Array<IObservableValue<Field | null>>
}

/**
 * Hand-written validator props.
 * - `v-*` — explicit validator namespace
 * - `x-*` — validator keys also allowed under `x-` for DX (e.g. `x-maxLength`)
 *
 * Routing (see `extractFieldPropsAndComponentProps`):
 * - `x-*` + key ∈ validator set → validator bucket
 * - `v-*` + key ∈ field-model set → field bucket
 * Dual keys like `required` / `pattern` therefore depend on which prefix you use.
 */
export type HyphenValidatorProps = Prettify<AppendPrefix<ValidatorProps, 'v-'>> &
  Prettify<AppendPrefix<ValidatorProps, 'x-'>>

/**
 * Public props for `f.*` / field components.
 *
 * - Typed API: hyphen directives only (`x-*` / `v-*`).
 * - Compiler inject (`$$*` / `v$$*`) works at **runtime** but is intentionally **not** typed here.
 * - Extra keys (`placeholder`, `className`, …) forward to the `as` UI component.
 * - Public API does **not** expose core's `component` / `value` / `plugins` factory fields;
 *   UI type is `as`, UI props are passthrough keys stored on the field model as `componentProps`.
 */
export type FieldProps = {
  name: string
  as?: string | React.FC<any>
  children?: React.ReactNode | undefined
} & HyphenFieldProps &
  HyphenValidatorProps & {
    /** Passthrough props for the rendered `as` component (not field/validator directives). */
    [key: string]: any
  }

/** Same as {@link FieldProps}; kept for call-site naming (`f.String` props). */
export type IFieldProps = FieldProps

export interface ValidatorProps {
  format?: ValidatorFormats
  required?: boolean
  pattern?: RegExp | string
  max?: number
  maximum?: number
  maxItems?: number
  minItems?: number
  maxLength?: number
  minLength?: number
  exclusiveMaximum?: number
  exclusiveMinimum?: number
  minimum?: number
  min?: number
  len?: number
  whitespace?: boolean
  enum?: any[]
  const?: any
  multipleOf?: number
  uniqueItems?: boolean
  maxProperties?: number
  minProperties?: number
}

type AppendPrefix<T, Prefix extends string> = {
  [K in keyof T as `${Prefix}${K & string}`]?: T[K]
}
type Prettify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

/**
 * Astro global available in all contexts in .astro files
 *
 * [Astro reference](https://docs.astro.build/reference/api-reference/#astro-global)
 */
export interface AstroFormGlobal<Props extends Record<string, any> = Record<string, any>> {
  props: Props
  form: Form
  ref: <T = Field>() => IObservableValue<T | null>
  slots: {
    /**
     * Check whether content for this slot name exists
     *
     * Example usage:
     * ```typescript
     *	if (Astro.slots.has('default')) {
     *   // Do something...
     *	}
     * ```
     */
    has(slotName: string): boolean
  }
}
