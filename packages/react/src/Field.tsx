/* eslint-disable consistent-return */
import React from 'react'
import type { FieldComponent, Field as FieldType } from '@astro-form/core'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'

import { ValueType, type FieldProps, type IFieldProps, ValidatorProps } from './types'
import { useForceUpdate } from './hooks/useForceUpdate'
import { useSyncFieldModel } from './hooks/useSyncFieldModel'
import { useSyncFieldValidators } from './hooks/useSyncFieldValidators'
import { useUpdateEffect } from './hooks/useUpdateEffect'
import { useForm } from './FormContext'
import { FieldProvider, useBasePath } from './FieldContext'
import { extractFieldPropsAndComponentProps, createFieldHelper } from './utils/extract-field-props'
import { shallowEqualRecord } from './utils/shallow-equal'

type FieldRenderProps = { path?: string; field?: FieldType; as?: string | React.FC<any> }

/**
 * Renders the UI bound to a core Field.
 *
 * ## `component` vs `as` (design note)
 * Core Field stores `component = [componentType, componentProps]` (Formily-style).
 * We set that tuple on create/update so `field.componentProps` holds UI passthrough
 * (`placeholder`, user `onChange`, `children`, …).
 *
 * **Rendering uses `props.as` for the element type**, not `field.componentType`.
 * So the tuple's first slot is kept for model parity / future schema-style use; the second
 * slot (`componentProps`) is what actually drives this render path. Public FieldProps does
 * not expose a `component` prop — callers pass `as` + plain DOM/control props.
 */
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
    // Runtime may include compiler inject (`$$*` / `v$$*`); not part of public FieldProps.
    const [fieldProps, compoenntProps, validatorProps] = extractFieldPropsAndComponentProps(props)

    const $$form = useForm()
    let basePath = useBasePath()
    // Prefer explicit basePath from directives (`x-basePath` / compiler inject) after extract.
    if (fieldProps.basePath !== undefined && fieldProps.basePath !== null) {
      basePath = String(fieldProps.basePath)
    }
    const ref = React.useRef<FieldType | null>(createFieldHelper(fieldProps, compoenntProps, $$form, basePath))
    const forceUpdate = useForceUpdate()

    /**
     * Mount / remount field on the owning Form.
     *
     * ## Why `$$form` was historically omitted from deps
     * Form is treated as a **tree-lifetime constant**: apps almost always do
     * `useMemo(() => createForm(), [])` + a single FormProvider. Field identity is
     * path-scoped under that one Form instance. Re-running this effect only when
     * `name` / `basePath` change matches “same form, field moves or renames”.
     *
     * Omitting `$$form` avoided accidental teardown of every field if a parent
     * ever recreated Form without meaning to (unstable `createForm()` each render).
     *
     * ## Why we include `$$form` now
     * If Provider really swaps form instances, fields must unmount from the old form
     * and register on the new one — that only happens when `$$form` is a dep.
     * When form is stable (`Object.is`), including it is a no-op. Prefer fixing
     * unstable form creation at the call site over hiding the dep forever.
     */
    React.useEffect(() => {
      ref.current = createFieldHelper(fieldProps, compoenntProps, $$form, basePath)
      // `$$ref` / `x-ref`: one box or array (slot multi-ref merge). Not a React DOM ref.
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
      // eslint-disable-next-line react-hooks/exhaustive-deps -- field/ui props sync via useUpdateEffect hooks below
    }, [$$form, basePath, fieldProps.name])

    // UI passthrough: extract always returns a new object; deps stay by reference.
    // Diff before write so parent re-renders with stable onClick/etc. do not thrash the model.
    useUpdateEffect(() => {
      if (!ref.current) return
      const field = ref.current
      if (field.componentType === fieldProps.as && shallowEqualRecord(field.componentProps, compoenntProps)) {
        return
      }
      // Sync core Field.component = [as, uiProps]. See FieldRender note on as vs componentType.
      field.component = [fieldProps.as, compoenntProps] as FieldComponent<any>
    }, [fieldProps.as, compoenntProps])

    useSyncFieldModel(ref, fieldProps)
    useSyncFieldValidators(ref, validatorProps)

    return <FieldRender path={ref.current?.path.toString()} field={ref.current!} as={fieldProps.as} ref={_ref} />
  })
)

/**
 * Inject value type for `f.*` without putting `$$*` on the public prop type.
 * React 19 `forwardRef` props are `Omit<P, 'ref'>`; with an index signature that can
 * erase required keys in the type checker, so accept a loose props shape here.
 */
function withValueType(props: Record<string, any>, valueType: ValueType): FieldProps {
  return { ...props, $$valueType: valueType } as unknown as FieldProps
}

const StringField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...withValueType(props, ValueType.String)} ref={ref} />
})
const NumberField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...withValueType(props, ValueType.Number)} ref={ref} />
})

const BooleanField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...withValueType(props, ValueType.Boolean)} ref={ref} />
})
const ObjectField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...withValueType(props, ValueType.Object)} ref={ref} />
})
const ArrayField = React.forwardRef<unknown, IFieldProps>((props, ref) => {
  return <BaseField {...withValueType(props, ValueType.Array)} ref={ref} />
})

export const f = {
  String: StringField,
  Number: NumberField,
  Boolean: BooleanField,
  Object: ObjectField,
  Array: ArrayField,
}
