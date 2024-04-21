/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Pattern as FormPathPattern } from '@formily/path'
import { ValidatorTriggerType } from '@formily/validator'
import { makeObservable, observable, action, computed, reaction } from 'mobx'
import { isValid } from '@astro-form/shared'

import { LifeCycles } from '@/types'

import type { JSXComponent, IFieldProps, IFieldResetOptions } from '../types'
import {
  getValuesFromEvent,
  isHTMLInputEvent,
  batchValidate,
  batchSubmit,
  batchReset,
  validateSelf,
  modifySelf,
} from '../shared/internals'

import type { Form } from './Form'
import { BaseField } from './BaseField'

export class Field<Component extends JSXComponent = any, ValueType = any> extends BaseField<Component, ValueType> {
  displayName = 'Field'

  active: boolean = false

  visited: boolean = false

  /** 字段输入值, 给用户提供的冗余值，仅存储不消费 */
  // @ts-expect-error
  inputValue: ValueType = null

  constructor(path: FormPathPattern, props: IFieldProps<Component, ValueType>, form: Form) {
    super(path, props, form)
    this.#makeObservable()
    this.#makeReactive()
  }

  #makeObservable() {
    makeObservable<Field, '_self'>(this, {
      _self: observable,
      data: observable,
      componentType: observable.ref,
      componentProps: observable,
      active: observable.ref,
      visited: observable.ref,
      dataSource: observable,
      validator: observable,
      feedbacks: observable,
      path: observable.ref,
      // Field defined states
      selfModified: observable.ref,
      modified: observable.ref,
      inputValue: observable.ref,
      validateFirst: observable.ref,
      initialized: computed,
      mounted: computed,
      unmounted: computed,
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
      setSelfErrors: action,
      setSelfWarnings: action,
      setSelfSuccesses: action,
      setValidator: action,
      setValidatorRule: action,
      setRequired: action,
      onInit: action,
      onMount: action,
      onUnmount: action,

      onInput: action,
      onFocus: action,
      onBlur: action,
    })
  }

  #makeReactive() {
    this.disposers.push(
      reaction(
        () => this.value,
        (value) => {
          this.notify(LifeCycles.ON_FIELD_VALUE_CHANGE)
          if (isValid(value) && this.selfModified) {
            validateSelf(this)
          }
        }
      ),
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

  notify(type: LifeCycles, payload?: any): void {
    this.form.notify(type, payload ?? this)
  }

  // 这几个不需要标注是 action，因为内部都是调用的 action 函数，而且是
  async validate(triggerType?: ValidatorTriggerType) {
    await batchValidate(this, `${this.path}.**`, triggerType)
  }

  async submit<T>(onSubmit?: (values: any) => Promise<T> | void): Promise<T> {
    return batchSubmit<T>(this, onSubmit)
  }

  async reset(options?: IFieldResetOptions) {
    await batchReset(this, `${this.path}.**`, options)
  }

  async onInput(...args: any[]) {
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
    modifySelf(this)
    this.notify(LifeCycles.ON_FIELD_INPUT_VALUE_CHANGE)
    this.notify(LifeCycles.ON_FORM_INPUT_CHANGE, this.form)
    await validateSelf(this, 'onInput')
  }

  async onFocus(...args: any[]) {
    if (args[0]?.target) {
      if (!isHTMLInputEvent(args[0], false)) return
    }
    this.active = true
    this.visited = true
    await validateSelf(this, 'onFocus')
  }

  async onBlur(...args: any[]) {
    if (args[0]?.target) {
      if (!isHTMLInputEvent(args[0], false)) return
    }
    this.active = false
    await validateSelf(this, 'onBlur')
  }
}
