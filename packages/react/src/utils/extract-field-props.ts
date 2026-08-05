import type { IFieldFactoryProps, Field as FieldType, FieldComponent, Form } from '@astro-form/core'
import type { IObservableValue } from 'mobx'
import { camelCase } from 'change-case-all'

import type { ValueType, ValidatorProps } from '../types'

/**
 * Internal field bag after directive extraction (package-private; not a public export surface).
 *
 * `$$valueType` / `$$ref` are compiler / internal inject keys:
 * - `f.String` etc. inject value type via `withValueType` (not on public FieldProps).
 * - `$$ref` may be one MobX box or an array after `passRefToChild` merges slot refs.
 */
export type ExtractedFieldProps = IFieldFactoryProps<any> & {
  name: string
  as?: string | React.FC<any>
  $$valueType?: ValueType
  $$ref?: IObservableValue<FieldType | null> | Array<IObservableValue<FieldType | null>>
}

/** Field model keys (align with core IBaseFieldProps / IFieldFactoryProps, minus component/value/plugins). */
const FIELD_PROP_KEYS = new Set([
  'initialValue',
  'required',
  'display',
  'pattern',
  'hidden',
  'visible',
  'editable',
  'disabled',
  'readPretty',
  'dataSource',
  'validator',
  'data',
  'validateFirst',
  'reactions',
  'basePath',
  'plugins',
])

/** Validator rule keys (align with ValidatorProps). */
const VALIDATOR_PROP_KEYS = new Set([
  'format',
  'required',
  'pattern',
  'max',
  'maximum',
  'maxItems',
  'minItems',
  'maxLength',
  'minLength',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'minimum',
  'min',
  'len',
  'whitespace',
  'enum',
  'const',
  'multipleOf',
  'uniqueItems',
  'maxProperties',
  'minProperties',
])

/**
 * Normalize prop suffix after `x-` / `v-`:
 * - `initialValue` stays `initialValue`
 * - `initial-value` → `initialValue`
 */
export function normalizeDirectiveKey(raw: string): string {
  if (!raw) return raw
  if (raw.includes('-')) {
    return camelCase(raw)
  }
  return raw
}

function assignFieldProp(target: ExtractedFieldProps, name: string, val: unknown) {
  if (name === 'ref') {
    // eslint-disable-next-line no-param-reassign
    target.$$ref = val as ExtractedFieldProps['$$ref']
    return
  }
  if (name === 'valueType') {
    // eslint-disable-next-line no-param-reassign
    target.$$valueType = val as ExtractedFieldProps['$$valueType']
    return
  }
  Object.assign(target, { [name]: val })
}

/**
 * Split React props into [field model props, UI/component props, validator rules].
 *
 * ## Prefix matrix (runtime)
 * | Prefix   | Purpose                                      | Public types? |
 * |----------|----------------------------------------------|---------------|
 * | `$$*`    | Compiler inject → field model                | no            |
 * | `v$$*`   | Compiler inject → validators                 | no            |
 * | `x-*`    | Hand-written; validator key → validators, else field | yes   |
 * | `v-*`    | Hand-written; field-model key → field, else validators | yes |
 * | other    | Forwarded to `as` UI (`componentProps`)      | passthrough   |
 *
 * Keep compiler prefixes working even if we never re-export them on FieldProps — `.aform`
 * and hand-written React may mix in one tree later.
 */
export function extractFieldPropsAndComponentProps(
  props: Record<string, any>
): [ExtractedFieldProps, Record<string | number | symbol, any>, ValidatorProps] {
  return Object.entries(props).reduce<ReturnType<typeof extractFieldPropsAndComponentProps>>(
    (acc, [key, val]) => {
      if (key.startsWith('$$')) {
        if (key === '$$valueType' || key === '$$ref') {
          acc[0][key] = val
        } else {
          Object.assign(acc[0], { [key.slice(2)]: val })
        }
      } else if (key === 'name' || key === 'as') {
        acc[0][key] = val
      } else if (key.startsWith('v$$')) {
        Object.assign(acc[2], { [key.slice(3)]: val })
      } else if (key.startsWith('v-')) {
        const name = normalizeDirectiveKey(key.slice(2))
        if (FIELD_PROP_KEYS.has(name)) {
          assignFieldProp(acc[0], name, val)
        } else {
          Object.assign(acc[2], { [name]: val })
        }
      } else if (key.startsWith('x-')) {
        const name = normalizeDirectiveKey(key.slice(2))
        if (VALIDATOR_PROP_KEYS.has(name)) {
          Object.assign(acc[2], { [name]: val })
        } else {
          assignFieldProp(acc[0], name, val)
        }
      } else {
        Object.assign(acc[1], { [key]: val })
      }
      return acc
    },
    [{} as any, {}, {}]
  )
}

export function createFieldHelper(
  props: ExtractedFieldProps,
  compoenntProps: Record<string | number | symbol, any>,
  form: Form<any>,
  basePath?: string
): FieldType | null {
  if (basePath === undefined) return null
  const { as, $$valueType: valueType, $$ref, ...rest } = props
  const fprops = { ...rest, basePath, component: [as, compoenntProps] as FieldComponent<any> }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let field: FieldType | undefined
  if (valueType === 'object') {
    field = form.createObjectField(fprops)
  } else if (valueType === 'array') {
    field = form.createArrayField(fprops)
  } else {
    field = form.createField(fprops)
  }
  if (field && !field.mounted) {
    field.onMount()
  }
  return field || null
}
