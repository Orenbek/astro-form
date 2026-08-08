import type React from 'react'
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

/** Core field factory props minus UI wiring (`component` / `value` / `plugins` / `name`). */
export type FieldModelProps = Omit<IFieldFactoryProps<any>, 'component' | 'value' | 'plugins' | 'name'>

/**
 * Field directives (`x-*` only). `v-*` is validators only — see {@link HyphenValidatorProps}.
 * `x-ref` is a MobX box (or array of boxes) for the core Field, not a React/DOM ref.
 * Compiler inject `$$*` is runtime-only, not typed here.
 */
export type HyphenFieldProps = Prettify<AppendPrefix<FieldModelProps, 'x-'>> & {
  'x-ref'?: IObservableValue<Field | null> | Array<IObservableValue<Field | null>>
}

/** Validator directives (`v-*` only). `required` / `pattern` live on field via `x-*`. */
export type HyphenValidatorProps = Prettify<AppendPrefix<ValidatorProps, 'v-'>>

export type FieldOwnProps = {
  name: string
  children?: React.ReactNode | undefined
} & HyphenFieldProps &
  HyphenValidatorProps

/**
 * Public props for `f.*` / BaseField.
 * - `C` is the `as` host; passthrough props + React `ref` follow `C`.
 * - Default must be a concrete tag (e.g. `'input'`), **not** `React.ElementType` —
 *   that widens `keyof` to `string` and kills autocomplete.
 * - Do **not** wrap the intersection in `Prettify` / mapped types: that erases the
 *   bare `as?: C` site and TypeScript can no longer infer `C` from `as={Component}`.
 * - Compiler `$$*` / `v$$*` work at runtime but are not typed.
 */
export type FieldProps<C extends React.ElementType = 'input'> = FieldOwnProps & {
  as?: C
} & Omit<React.ComponentPropsWithoutRef<C>, keyof FieldOwnProps | 'as' | 'value'>

/** Alias of {@link FieldProps}. */
export type IFieldProps<C extends React.ElementType = 'input'> = FieldProps<C>

/**
 * Polymorphic field component. Interface call signature helps infer `C` from `as={...}`.
 * React `ref` → `as` instance; core Field → `x-ref`.
 */
export interface FieldComponent {
  <C extends React.ElementType = 'input'>(
    props: FieldProps<C> & React.RefAttributes<React.ComponentRef<C>>
  ): React.ReactElement | null
}

export interface ValidatorProps {
  format?: ValidatorFormats
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

/** Injected into `.aform` / compiled components as the Astro-like form global. */
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

/**
 * Host-facing props projected from a core Field.
 *
 * ## Design: Field model drives the UI
 * - JSX `x-disabled` / reactions / `field.disabled` write the **model**.
 * - Render reads the model and produces component props (this helper).
 * - Pure UI passthrough (`className`, `placeholder`, …) stays in `componentProps`
 *   and must be spread **before** this object so model wins on conflicts.
 *
 * Not a bidirectional sync: DOM `disabled` does not write back to the field.
 * Value changes flow the other way only through events (`onInput` / `onChange`).
 */
export type FieldComponentStateProps = {
  value?: unknown
  checked?: boolean
  /** `field.pattern === 'disabled'` (inherits parent/form pattern). */
  disabled?: boolean
  /** `field.pattern === 'readPretty'` — prefer readOnly so text remains selectable. */
  readOnly?: boolean
}
