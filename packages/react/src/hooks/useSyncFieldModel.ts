import type { MutableRefObject } from 'react'
import type { Field as FieldType } from '@astro-form/core'
import { runInAction } from 'mobx'

import type { ExtractedFieldProps } from '../utils/extract-field-props'

import { useUpdateEffect } from './useUpdateEffect'

/**
 * @internal Package-private — used only by `BaseField`. Not exported from package entry.
 *
 * Sync core Field model props after mount when directive values change.
 * Deps are value identity (not the extract bag object) so parent re-renders
 * that only reallocate `extractFieldPropsAndComponentProps` results do not re-run.
 */
export function useSyncFieldModel(fieldRef: MutableRefObject<FieldType | null>, fieldProps: ExtractedFieldProps) {
  useUpdateEffect(() => {
    runInAction(() => {
      if (!fieldRef.current) return
      const field = fieldRef.current
      field.initialValue = fieldProps.initialValue
      field.required = fieldProps.required!
      field.display = fieldProps.display!
      field.pattern = fieldProps.pattern!
      field.hidden = fieldProps.hidden!
      field.visible = fieldProps.visible!
      field.editable = fieldProps.editable!
      field.disabled = fieldProps.disabled!
      field.readPretty = fieldProps.readPretty!
      field.dataSource = fieldProps.dataSource!
      field.validator = fieldProps.validator!
      field.validateFirst = fieldProps.validateFirst!
      field.data = fieldProps.data!
    })
  }, [
    fieldRef,
    fieldProps.initialValue,
    fieldProps.required,
    fieldProps.display,
    fieldProps.pattern,
    fieldProps.hidden,
    fieldProps.visible,
    fieldProps.editable,
    fieldProps.disabled,
    fieldProps.readPretty,
    fieldProps.dataSource,
    fieldProps.validator,
    fieldProps.validateFirst,
    fieldProps.data,
  ])
}
