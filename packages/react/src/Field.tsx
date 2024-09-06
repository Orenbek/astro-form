/* eslint-disable consistent-return */
import React from 'react'
import type { FieldComponent, Field as FieldType } from '@astro-form/core'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'

import { ValueType, type FieldProps, type IFieldProps, ValidatorProps } from './types'
import { useForceUpdate } from './hooks/useForceUpdate'
import { useForm } from './FormContext'
import { FieldProvider, useBasePath } from './FieldContext'
import { extractFieldPropsAndComponentProps, createFieldHelper } from './utils/extract-field-props'
import { useUpdateEffect } from './hooks/useUpdateEffect'

type FieldRenderProps = { path?: string; field?: FieldType; as?: string | React.FC<any> }

const FieldRender = observer<FieldRenderProps, unknown>(
  React.forwardRef<unknown, FieldRenderProps>(function _FieldRender(props, ref) {
    const { field } = props
    const onChange = (...args: any[]) => {
      field?.onInput(...args)
      field?.componentProps.onChange?.(...args)
    }
    const onFocus = (...args: any[]) => {
      field?.onFocus(...args)
      field?.componentProps.onFocus?.(...args)
    }
    const onBlur = (...args: any[]) => {
      field?.onBlur(...args)
      field?.componentProps.onBlur?.(...args)
    }
    const children = (() => {
      if (field && field.display !== 'visible') return null
      if (props.as) {
        return React.createElement(
          props.as,
          {
            pattern: field?.pattern,
            ...field?.componentProps,
            value: field?.value,
            onChange,
            onFocus,
            onBlur,
            ref,
          },
          field?.componentProps.children || null
        )
      }
      return field?.componentProps.children || null
    })()
    return <FieldProvider basePath={props.path}>{children}</FieldProvider>
  })
)

export const BaseField = observer<FieldProps, unknown>(
  React.forwardRef<unknown, FieldProps>(function Field(props, _ref) {
    const [fieldProps, compoenntProps, validatorProps] = extractFieldPropsAndComponentProps(props)

    const $$form = useForm()
    let basePath = useBasePath()
    if (props.$$basePath) {
      basePath = props.$$basePath as string
    }
    const ref = React.useRef<FieldType | null>(createFieldHelper(fieldProps, compoenntProps, $$form, basePath))
    const forceUpdate = useForceUpdate()

    React.useEffect(() => {
      ref.current = createFieldHelper(fieldProps, compoenntProps, $$form, basePath)
      const xref = fieldProps.$$ref
      if (xref) {
        if (Array.isArray(xref)) {
          xref.forEach((item) => item.set(ref.current!))
        } else {
          xref.set(ref.current!)
        }
      }
      runInAction(() => {
        if (ref.current) {
          // 创建实例后更新 validator
          Object.keys(validatorProps).forEach((key) =>
            ref.current!.setValidatorRule(key, validatorProps[key as keyof ValidatorProps])
          )
        }
      })

      forceUpdate()
      return () => {
        ref.current?.onUnmount()
      }
    }, [basePath, fieldProps.name])

    useUpdateEffect(() => {
      if (!ref.current) return
      ref.current.component = [fieldProps.as, compoenntProps] as FieldComponent<any>
    }, [fieldProps.as, compoenntProps])

    useUpdateEffect(() => {
      runInAction(() => {
        if (!ref.current) return
        ref.current.initialValue = fieldProps.initialValue
        ref.current.required = fieldProps.required!
        ref.current.display = fieldProps.display!
        ref.current.pattern = fieldProps.pattern!
        ref.current.hidden = fieldProps.hidden!
        ref.current.visible = fieldProps.visible!
        ref.current.editable = fieldProps.editable!
        ref.current.disabled = fieldProps.disabled!
        ref.current.readPretty = fieldProps.readPretty!
        ref.current.dataSource = fieldProps.dataSource!
        ref.current.validator = fieldProps.validator!
        ref.current.validateFirst = fieldProps.validateFirst!
        ref.current.data = fieldProps.data!
      })
    }, [fieldProps])

    useUpdateEffect(() => {
      if (!ref.current) return
      runInAction(() => {
        Object.keys(validatorProps).forEach((key) => {
          ref.current!.setValidatorRule(key, validatorProps[key as keyof ValidatorProps])
        })
      })
    }, [validatorProps])

    return <FieldRender path={ref.current?.path.toString()} field={ref.current!} as={fieldProps.as} ref={_ref} />
  })
)

const StringField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...props} $$valueType={ValueType.String} ref={ref} />
})
const NumberField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...props} $$valueType={ValueType.Number} ref={ref} />
})

const BooleanField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...props} $$valueType={ValueType.Boolean} ref={ref} />
})
const ObjectField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...props} $$valueType={ValueType.Object} ref={ref} />
})
const ArrayField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...props} $$valueType={ValueType.Array} ref={ref} />
})

export const f = {
  String: StringField,
  Number: NumberField,
  Boolean: BooleanField,
  Object: ObjectField,
  Array: ArrayField,
}
