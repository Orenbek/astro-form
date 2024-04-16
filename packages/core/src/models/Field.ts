/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Pattern as FormPathPattern } from '@formily/path'
import { ValidatorTriggerType } from '@formily/validator'
import { makeObservable, observable, action, computed, reaction } from 'mobx'
import { isValid } from '@astro-form/shared'

import { LifeCycleTypes } from '@/types'

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

  /** 字段自身是否被手动修改过 */
  selfModified: boolean = false

  /** 字段子树是否被手动修改过 */
  modified: boolean = false

  /** 字段输入值 */
  // @ts-expect-error
  inputValue: ValueType = null

  /** 字段输入值集合 */
  inputValues: any[] = []

  /** 字段校验是否只校验第一个非法规则 */
  validateFirst?: boolean

  constructor(path: FormPathPattern, props: IFieldProps<Component, ValueType>, form: Form) {
    super(path, props, form)
    this.locate(path, this)
    this.initialize(props)
    this.makeObservable()
    this.makeReactive()
  }

  protected initialize(props: IFieldProps<Component, ValueType>) {
    if (isValid(props.validateFirst)) {
      this.validateFirst = props.validateFirst
    }
  }

  protected makeObservable() {
    makeObservable<Field, '_display' | '_pattern'>(this, {
      _display: observable.ref,
      _pattern: observable.ref,
      initialized: observable.ref,
      mounted: observable.ref,
      unmounted: observable.ref,
      data: observable.shallow,
      componentType: observable.ref,
      componentProps: observable,
      loading: observable.ref,
      validating: observable.ref,
      submitting: observable.ref,
      active: observable.ref,
      visited: observable.ref,
      dataSource: observable,
      validator: observable.shallow,
      feedbacks: observable,
      path: observable.ref,
      // Field defined states
      selfModified: observable.ref,
      modified: observable.ref,
      inputValue: observable.ref,
      inputValues: observable,
      validateFirst: observable.ref,
      parent: computed,
      component: computed,
      display: computed,
      pattern: computed,
      hidden: computed,
      visible: computed,
      editable: computed,
      disabled: computed,
      readPretty: computed,
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

  protected makeReactive() {
    this.disposers.push(
      reaction(
        () => this.value,
        (value) => {
          this.notify(LifeCycleTypes.ON_FIELD_VALUE_CHANGE)
          if (isValid(value) && this.selfModified) {
            validateSelf(this)
          }
        }
      ),
      reaction(
        () => this.initialValue,
        () => {
          this.notify(LifeCycleTypes.ON_FIELD_INITIAL_VALUE_CHANGE)
        }
      )
    )
  }

  notify(type: LifeCycleTypes, payload?: any): void {
    this.form.notify(type, payload ?? this)
  }

  // 这几个不需要标注是 action，因为内部都是调用的 action 函数，而且是
  async validate(triggerType?: ValidatorTriggerType) {
    await batchValidate(this, `${this.path}.**`, triggerType)
  }

  async submit<T>(onSubmit?: (values: any) => Promise<T> | void) {
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

    const values = getValues(args)
    const value = values[0]
    this.inputValue = value
    this.inputValues = values
    this.value = value
    modifySelf(this)
    this.notify(LifeCycleTypes.ON_FIELD_INPUT_VALUE_CHANGE)
    this.notify(LifeCycleTypes.ON_FORM_INPUT_CHANGE, this.form)
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
