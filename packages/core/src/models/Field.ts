/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Pattern as FormPathPattern } from '@formily/path'
import { ValidatorTriggerType } from '@formily/validator'
import { makeObservable, observable, action, computed, reaction, autorun, toJS, flow } from 'mobx'
import { isArr, isFn, isValid } from '@astro-form/shared'

import { LifeCycles } from '@/types'

import type { JSXComponent, IFieldProps, IFieldResetOptions, FieldReaction } from '../types'
import { getValuesFromEvent, isHTMLInputEvent, batchValidate, validateSelf } from '../shared/internals'
import { isArrayField, isObjectField } from '../shared/checkers'

import type { Form } from './Form'
import { BaseField } from './BaseField'

export class Field<Component extends JSXComponent = any, ValueType = any> extends BaseField<Component, ValueType> {
  displayName = 'Field'

  private _private = {
    active: false,
    visited: false,
  }

  /** 字段输入值, 给用户提供的冗余值，仅存储不消费 */
  // @ts-expect-error
  inputValue: ValueType = null

  constructor(path: FormPathPattern, props: IFieldProps<Component, ValueType>, form: Form) {
    super(path, props, form)
    this.#makeObservable()
    // 得放在 makeObservable 执行之后，不然 this 中标注的 observable.ref 并不会生效
    this.#initialize(props)
    this.#makeReactive()
  }

  #initialize(props: IFieldProps<Component, ValueType>) {
    if (isValid(props.reactions)) {
      if (isArr(props.reactions)) {
        props.reactions.forEach((fn) => {
          this.disposers.push(autorun(() => fn(this as any)))
        })
      } else {
        this.disposers.push(autorun(() => (props.reactions as FieldReaction)(this as any)))
      }
    }
  }

  #makeObservable() {
    makeObservable<Field, '_self'>(this, {
      _self: observable,
      data: observable,
      componentType: observable.ref,
      componentProps: observable,
      dataSource: observable,
      validator: observable.ref,
      // Field defined states

      validateFirst: observable.ref,
      inputValue: observable.ref,
      form: computed,
      path: computed,
      initialized: computed,
      mounted: computed,
      unmounted: computed,
      selfModified: computed,
      modified: computed,
      parent: computed,
      display: computed,
      pattern: computed,
      hidden: computed,
      visible: computed,
      editable: computed,
      disabled: computed,
      readPretty: computed,
      loading: computed,
      validating: computed,
      submitting: computed,
      feedbacks: computed,
      selfErrors: computed,
      errors: computed,
      selfWarnings: computed,
      warnings: computed,
      selfSuccesses: computed,
      successes: computed,
      selfValid: computed,
      valid: computed,
      selfInvalid: computed,
      invalid: computed,
      value: computed,
      initialValue: computed,
      component: computed,
      required: computed,
      validateStatus: computed,
      destroyed: computed,
      active: computed,
      visited: computed,

      setValue: action,
      setInitialValue: action,
      setDisplay: action,
      setPattern: action,
      setLoading: action,
      setValidating: action,
      setSubmitting: action,
      setComponent: action,
      setComponentProps: action,
      setData: action,
      setDataSource: action,
      setFeedback: action,
      clearFeedback: action,
      setSelfErrors: action,
      setSelfWarnings: action,
      setSelfSuccesses: action,
      setValidator: action,
      setValidatorRule: action,
      setRequired: action,
      onMount: action,
      onUnmount: action,
      destroy: action,

      onInput: flow,
      onFocus: flow,
      onBlur: flow,
    })
  }

  #makeReactive() {
    this.disposers.push(
      reaction(
        () => this.initialValue,
        (initialValue) => {
          this.notify(LifeCycles.ON_FIELD_INITIAL_VALUE_CHANGE)
          /**
           * 这个地方写一点额外的 action 逻辑，写在这里是为了方便
           * 修改 initialValue 时需要根据当前 field 的状态决定要不要赋值给 value。
           * 由于用户可能会在 field.setInitialValue 中操作 也有可能在 form.setInitialValues, form.setInitialValuesIn
           * 中修改 initialValue，因此需要这些地方都做好处理。特别是 setInitialValues setInitialValuesIn 中得先 diff 出
           * 哪些部分有修改，然后遍历所有相关 field，太麻烦
           *
           * 若 field 没有值且没有被修改过，则修改 value 值
           * 这种处理方式下 初始化的时候这里会多触发一次
           */
          if (this.value === undefined && !this.selfModified && initialValue !== undefined) {
            // arrayField 和 ObjectField 怎么办，他们的 value 不可能是 undefiend
            this.value = initialValue
          }
        }
      ),
      reaction(
        () => this.loading,
        (loading) => {
          if (loading) {
            this.notify(LifeCycles.ON_FIELD_LOADING)
          }
        }
      ),
      reaction(
        () => this.validating,
        (validating) => {
          if (validating) {
            this.notify(LifeCycles.ON_FIELD_VALIDATE_START)
            this.notify(LifeCycles.ON_FIELD_VALIDATING)
          } else {
            this.notify(LifeCycles.ON_FIELD_VALIDATE_END)
          }
        }
      ),
      reaction(
        () => this.submitting,
        (submitting) => {
          if (submitting) {
            this.notify(LifeCycles.ON_FIELD_SUBMIT_START)
            this.notify(LifeCycles.ON_FIELD_SUBMITTING)
          } else {
            this.notify(LifeCycles.ON_FIELD_SUBMIT_END)
          }
        }
      )
    )
  }

  get active() {
    return this._private.active
  }

  get visited() {
    return this._private.visited
  }

  // 这几个不需要标注是 action，因为内部都是调用的 action 函数
  async validate(triggerType?: ValidatorTriggerType) {
    await batchValidate(this, `${this.path}.**`, triggerType)
  }

  async submit<T>(onSubmit?: (values: any) => Promise<T> | void): Promise<T> {
    this.setSubmitting(true)
    try {
      this.notify(LifeCycles.ON_FIELD_SUBMIT_VALIDATE_START)
      await this.validate()
      this.notify(LifeCycles.ON_FIELD_SUBMIT_VALIDATE_SUCCESS)
    } catch (e) {
      this.notify(LifeCycles.ON_FIELD_SUBMIT_VALIDATE_FAILED)
    }
    this.notify(LifeCycles.ON_FIELD_SUBMIT_VALIDATE_END)
    let results: any
    try {
      if (this.invalid) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw this.errors
      }
      if (isFn(onSubmit)) {
        results = await onSubmit(toJS(this.value))
      } else {
        results = toJS(this.value)
      }
      this.notify(LifeCycles.ON_FIELD_SUBMIT_SUCCESS)
    } catch (e) {
      this.setSubmitting(false)
      this.notify(LifeCycles.ON_FIELD_SUBMIT_FAILED)
      this.notify(LifeCycles.ON_FIELD_SUBMIT)
      throw e
    }
    this.setSubmitting(false)
    this.notify(LifeCycles.ON_FIELD_SUBMIT)
    return results
  }

  async reset(options?: IFieldResetOptions) {
    const tasks: Array<Promise<any>> = []
    this.query(`${this.path}.**`).forEach((field) => {
      tasks.push(field.resetSelf(options, this === field))
    })
    this.notify(LifeCycles.ON_FIELD_RESET)
    await Promise.all(tasks)
  }

  async resetSelf(options?: IFieldResetOptions, noEmit = false) {
    this._self.selfModified = false
    this._private.visited = false
    /** clear feedbacks */
    this.setFeedback({ type: 'error', messages: [] })
    this.setFeedback({ type: 'warning', messages: [] })
    this.setFeedback({ type: 'success', messages: [] })

    const typedDefaultValue = (() => {
      if (isArrayField(this)) return []
      if (isObjectField(this)) return {}
      return undefined
    })()
    this.inputValue = typedDefaultValue as any
    if (this.value !== undefined) {
      if (options?.forceClear) {
        this.value = typedDefaultValue as any
      } else {
        const { initialValue } = this
        this.value = toJS(initialValue !== undefined ? initialValue : typedDefaultValue) as any
      }
    }
    if (!noEmit) {
      this.notify(LifeCycles.ON_FIELD_RESET)
    }
    if (options?.validate) {
      return validateSelf(this)
    }
    return null
  }

  *onInput(...args: any[]) {
    const isHTMLInputEventFromSelf = (_args: any[]) =>
      isHTMLInputEvent(_args[0]) && 'currentTarget' in _args[0] ? _args[0]?.target === _args[0]?.currentTarget : true
    const getValues = (_args: any[]) => {
      if (_args[0]?.target) {
        if (!isHTMLInputEvent(_args[0])) return _args
      }
      return getValuesFromEvent(_args)
    }

    if (!isHTMLInputEventFromSelf(args)) return

    const value = getValues(args)[0]
    this.inputValue = value
    this.value = value
    this._self.selfModified = true
    this.form.modified = true
    this.notify(LifeCycles.ON_FIELD_INPUT_VALUE_CHANGE)
    this.notify(LifeCycles.ON_FORM_INPUT_CHANGE, this.form)
    yield validateSelf(this, 'onInput')
  }

  *onFocus(...args: any[]) {
    if (args[0]?.target) {
      if (!isHTMLInputEvent(args[0], false)) return
    }
    this._private.active = true
    this._private.visited = true
    yield validateSelf(this, 'onFocus')
  }

  *onBlur(...args: any[]) {
    if (args[0]?.target) {
      if (!isHTMLInputEvent(args[0], false)) return
    }
    this._private.active = false
    yield validateSelf(this, 'onBlur')
  }
}
