/* eslint-disable consistent-return */
import React from 'react'
import type { FieldComponent, Field as FieldType } from '@astro-form/core'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'

import { ValueType, type FieldProps, type IFieldProps } from './types'
import { useForceUpdate } from './hooks/useForceUpdate'
import { useForm } from './FormContext'
import { FieldProvider, useBasePath } from './FieldContext'
import { extractFieldPropsAndComponentProps } from './utils/extract-field-props'

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
    const [fieldProps, compoenntProps] = extractFieldPropsAndComponentProps(props)

    const $$form = useForm()
    const basePath = useBasePath()
    const ref = React.useRef<FieldType>()
    const forceUpdate = useForceUpdate()

    React.useEffect(() => {
      if (basePath === undefined) return
      const { as, $$valueType: valueType, $$ref: xref, ...rest } = fieldProps
      const fprops = { ...rest, basePath, component: [as, compoenntProps] as FieldComponent<any> }
      if (valueType === 'object') {
        ref.current = $$form.createObjectField(fprops)
      } else if (valueType === 'array') {
        ref.current = $$form.createArrayField(fprops)
      } else {
        const res = $$form.createField(fprops)
        ref.current = res
      }
      if (xref) {
        if (Array.isArray(xref)) {
          xref.forEach((item) => item.set(ref.current!))
        } else {
          xref.set(ref.current!)
        }
      }
      ref.current!.onMount()
      forceUpdate()
      return () => {
        ref.current!.onUnmount()
      }
    }, [basePath, fieldProps.name])

    React.useEffect(() => {
      if (!ref.current) return
      ref.current.component = [fieldProps.as, compoenntProps] as FieldComponent<any>
    }, [fieldProps.as, compoenntProps])

    React.useEffect(() => {
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
