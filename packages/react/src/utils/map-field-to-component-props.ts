import type { Field } from '@astro-form/core'
import type { FieldComponentStateProps } from '../types'

/**
 * Map Field model state → props for the `as` host component.
 *
 * @example
 * ```tsx
 * React.createElement(as, {
 *   ...field.componentProps,
 *   ...mapFieldToComponentProps(field),
 *   onChange,
 * })
 * ```
 */
export function mapFieldToComponentProps(field: Field | null | undefined): FieldComponentStateProps {
  if (!field) {
    return {}
  }

  const isCheckbox = field.componentProps?.type === 'checkbox'
  const base: FieldComponentStateProps = {
    disabled: field.disabled,
    readOnly: field.readPretty,
  }

  if (isCheckbox) {
    return { ...base, checked: Boolean(field.value) }
  }
  return { ...base, value: field.value }
}
