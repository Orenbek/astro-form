/* eslint-disable consistent-return */
import React from 'react'
import { FieldComponent, Field as FieldType, IFieldFactoryProps } from '@astro-form/core'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'

import { ValueType, type FieldProps, type IFieldProps } from './types'
import { useForceUpdate } from './hooks/useForceUpdate'
import { useForm } from './FormContext'
import { FieldProvider, useBasePath } from './FieldContext'

const FieldRender: React.FC<{ path?: string; field?: FieldType; as: string | React.FC<any> }> = observer(
  function _FieldRender(props) {
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
    if (field && field.display !== 'visible') return null
    const children = React.createElement(
      props.as,
      {
        pattern: field?.pattern,
        ...field?.componentProps,
        value: field?.value,
        onChange,
        onFocus,
        onBlur,
      },
      field?.componentProps.children || null
    )
    return <FieldProvider basePath={props.path}>{children}</FieldProvider>
  }
)

const Field = React.forwardRef<FieldType | undefined, FieldProps>((props, fieldRef) => {
  const basePath = useBasePath()
  const [fieldProps, compoenntProps] = Object.entries(props).reduce<
    [IFieldFactoryProps<any> & Pick<FieldProps, 'x-valueType' | 'x-as'>, Record<string | number | symbol, any>]
  >(
    (acc, [key, val]) => {
      if (key.startsWith('x-')) {
        if (key === 'x-valueType' || key === 'x-as') {
          acc[0][key] = val
        } else {
          Object.assign(acc[0], { [key.slice(2)]: val })
        }
      } else {
        Object.assign(acc[1], { [key]: val })
      }
      return acc
    },
    [{} as any, {}]
  )
  const $$form = useForm()
  const ref = React.useRef<FieldType>()
  const forceUpdate = useForceUpdate()

  React.useEffect(() => {
    if (basePath === undefined) return
    const { 'x-valueType': valueType, 'x-as': as, ...rest } = fieldProps
    const fprops = { ...rest, basePath, component: [as, compoenntProps] as FieldComponent<any> }
    if (valueType === 'object') {
      ref.current = $$form.createObjectField(fprops)
    } else if (valueType === 'array') {
      ref.current = $$form.createArrayField(fprops)
    } else {
      ref.current = $$form.createField(fprops)
    }
    ref.current!.onMount()
    forceUpdate()
    return () => {
      ref.current!.onUnmount()
    }
  }, [basePath, fieldProps.name])

  React.useImperativeHandle(fieldRef, () => ref.current)

  React.useEffect(() => {
    if (!ref.current) return
    ref.current.component = [fieldProps['x-as'], compoenntProps] as FieldComponent<any>
  }, [fieldProps['x-as'], compoenntProps])

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

  return <FieldRender path={ref.current?.path.toString()} field={ref.current!} as={fieldProps['x-as']} />
})
export const BaseField = observer(Field)

const StringField = React.forwardRef<FieldType | undefined, IFieldProps>((props, ref) => {
  return <BaseField {...props} x-valueType={ValueType.String} ref={ref} />
})
const NumberField = React.forwardRef<FieldType | undefined, IFieldProps>((props, ref) => {
  return <BaseField {...props} x-valueType={ValueType.Number} ref={ref} />
})

const BooleanField = React.forwardRef<FieldType | undefined, IFieldProps>((props, ref) => {
  return <BaseField {...props} x-valueType={ValueType.Boolean} ref={ref} />
})
const ObjectField = React.forwardRef<FieldType | undefined, IFieldProps>((props, ref) => {
  return <BaseField {...props} x-valueType={ValueType.Object} ref={ref} />
})
const ArrayField = React.forwardRef<FieldType | undefined, IFieldProps>((props, ref) => {
  return <BaseField {...props} x-valueType={ValueType.Array} ref={ref} />
})

export const f = {
  String: StringField,
  Number: NumberField,
  Boolean: BooleanField,
  Object: ObjectField,
  Array: ArrayField,
}
