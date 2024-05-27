import React from 'react'
import { FieldComponent, Field as FieldType, IFieldFactoryProps } from '@astro-form/core'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'

import type { FieldProps } from './types'
import { useForceUpdate } from './hooks/useForceUpdate'
import { useForm } from './FormContext'

const Field: React.FC<FieldProps> = (props) => {
  const [fieldFactoryProps, compoenntProps] = Object.entries(props).reduce<
    [IFieldFactoryProps<any> & Pick<FieldProps, '$$fieldType' | '$$as'>, Record<string | number | symbol, any>]
  >(
    (acc, [key, val]) => {
      if (key.startsWith('$$')) {
        if (key === '$$fieldType') {
          acc[0].$$fieldType = val
        } else if (key === '$$as') {
          acc[0].$$as = val
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
  const { $$fieldType, $$as, ...rest } = fieldFactoryProps
  const ref = React.useRef<FieldType>()
  const forceUpdate = useForceUpdate()

  React.useEffect(() => {
    const fieldProps = { ...rest, component: [$$as, compoenntProps] as FieldComponent<any> }
    if ($$fieldType === 'object') {
      ref.current = $$form.createObjectField(fieldProps)
    } else if ($$fieldType === 'array') {
      ref.current = $$form.createArrayField(fieldProps)
    } else {
      ref.current = $$form.createField(fieldProps)
    }
    ref.current!.onMount()
    forceUpdate()
    return () => {
      ref.current!.onUnmount()
    }
  }, [rest.basePath, rest.name])

  React.useEffect(() => {
    if (!ref.current) return
    ref.current.component = [$$as, compoenntProps] as FieldComponent<any>
  }, [$$as, compoenntProps])

  React.useEffect(() => {
    runInAction(() => {
      if (!ref.current) return
      ref.current.value = rest.value
      ref.current.initialValue = rest.initialValue
      ref.current.required = rest.required!
      ref.current.display = rest.display!
      ref.current.pattern = rest.pattern!
      ref.current.hidden = rest.hidden!
      ref.current.visible = rest.visible!
      ref.current.editable = rest.editable!
      ref.current.disabled = rest.disabled!
      ref.current.readPretty = rest.readPretty!
      ref.current.dataSource = rest.dataSource!
      ref.current.validator = rest.validator!
      ref.current.validateFirst = rest.validateFirst!
      ref.current.data = rest.data!
    })
  }, [rest])

  const onChange = (...args: any[]) => {
    ref.current?.onInput(...args)
    compoenntProps.onChange?.(...args)
  }
  const onFocus = (...args: any[]) => {
    ref.current?.onFocus(...args)
    compoenntProps.onFocus?.(...args)
  }
  const onBlur = (...args: any[]) => {
    ref.current?.onBlur(...args)
    compoenntProps.onBlur?.(...args)
  }
  if (ref.current && ref.current.display !== 'visible') return null

  return React.createElement(
    $$as,
    {
      editable: ref.current?.editable,
      disabled: ref.current?.disabled,
      readPretty: ref.current?.readPretty,
      ...ref.current?.componentProps,
      value: ref.current?.value,
      onChange,
      onFocus,
      onBlur,
    },
    compoenntProps.children || null
  )
}

export default observer(Field)
