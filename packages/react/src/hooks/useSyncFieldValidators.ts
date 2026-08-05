import type { MutableRefObject } from 'react'
import type { Field as FieldType } from '@astro-form/core'
import { runInAction } from 'mobx'

import type { ValidatorProps } from '../types'

import { useUpdateEffect } from './useUpdateEffect'

/**
 * @internal Package-private — used only by `BaseField`. Not exported from package entry.
 *
 * Sync Formily-style validator rules onto the core Field after mount.
 * Deps are per-rule values (not the extract bag object).
 */
export function useSyncFieldValidators(fieldRef: MutableRefObject<FieldType | null>, validatorProps: ValidatorProps) {
  useUpdateEffect(() => {
    if (!fieldRef.current) return
    runInAction(() => {
      Object.keys(validatorProps).forEach((key) => {
        fieldRef.current!.setValidatorRule(key, validatorProps[key as keyof ValidatorProps])
      })
    })
  }, [
    fieldRef,
    validatorProps.format,
    validatorProps.required,
    validatorProps.pattern,
    validatorProps.max,
    validatorProps.maximum,
    validatorProps.maxItems,
    validatorProps.minItems,
    validatorProps.maxLength,
    validatorProps.minLength,
    validatorProps.exclusiveMaximum,
    validatorProps.exclusiveMinimum,
    validatorProps.minimum,
    validatorProps.min,
    validatorProps.len,
    validatorProps.whitespace,
    validatorProps.enum,
    validatorProps.const,
    validatorProps.multipleOf,
    validatorProps.uniqueItems,
    validatorProps.maxProperties,
    validatorProps.minProperties,
  ])
}
