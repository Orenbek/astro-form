/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ValidatorTriggerType } from '@formily/validator'
import { makeObservable, observable, action, computed, reaction, autorun, toJS, flow } from 'mobx'
import { isArr, isFn, isValid } from '@astro-form/shared'

import { LifeCycles, FormPathPattern } from '@/types'

import type { JSXComponent, IFieldProps, IFieldResetOptions, FieldReaction } from '../types'
import { getValuesFromEvent, isHTMLInputEvent, batchValidate, validateSelf } from '../shared/internals'
import { isArrayField, isObjectField } from '../shared/checkers'
import type { FieldPlugin } from '../plugins/type'

import type { Form } from './Form'
import { BaseField } from './BaseField'

export class Field<Component extends JSXComponent = any, ValueType = any> extends BaseField<Component, ValueType> {
  displayName = 'Field'

  private _private = {
    active: false,
    visited: false,
    plugins: [] as FieldPlugin[],
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
    if (props.plugins) {
      props.plugins.forEach((Plugin) => {
        const plugin = new Plugin(this)
        this._private.plugins.push(plugin)
      })
    }
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
        () => {
          this.notify(LifeCycles.ON_FIELD_INITIAL_VALUE_CHANGE)
        }
      ),
      reaction(
        () => this.value,
        () => {
          this.notify(LifeCycles.ON_FIELD_VALUE_CHANGE)
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

  destroy(forceClear = true) {
    this.disposers.forEach((dispose) => dispose())
    this._private.plugins.forEach((plugin) => plugin.destroy())
    if (forceClear) {
      this.form.deleteValuesIn(this.path)
      this.form.deleteInitialValuesIn(this.path)
    }
    delete this.form.fields[this.path.toString()]
    delete this.form.indexes[this.path.toString()]
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

  async resetSelf(options?: IFieldResetOptions, noEmit = false): Promise<any> {
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

  *onInput(...args: any[]): Generator<Promise<any>, void, unknown> {
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

  *onFocus(...args: any[]): Generator<Promise<any>, void, unknown> {
    if (args[0]?.target) {
      if (!isHTMLInputEvent(args[0], false)) return
    }
    this._private.active = true
    this._private.visited = true
    yield validateSelf(this, 'onFocus')
  }

  *onBlur(...args: any[]): Generator<Promise<any>, void, unknown> {
    if (args[0]?.target) {
      if (!isHTMLInputEvent(args[0], false)) return
    }
    this._private.active = false
    yield validateSelf(this, 'onBlur')
  }
}
