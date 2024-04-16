/* eslint-disable @typescript-eslint/ban-ts-comment */
import { isValid, isFn, isArr } from '@astro-form/shared'
import { Path as FormPath, Pattern as FormPathPattern } from '@formily/path'
import { parseValidatorDescriptions } from '@formily/validator'
import type { IReactionDisposer } from 'mobx'

import type {
  JSXComponent,
  FieldDisplayTypes,
  FieldPatternTypes,
  FieldComponent,
  FieldValidator,
  FieldDataSource,
  IBaseFieldProps,
  IFieldFeedback,
  IFormFeedback,
  ISearchFeedback,
} from '../types'
import { LifeCycleTypes } from '../types'
import {
  locateNode,
  destroy,
  updateFeedback,
  queryFeedbackMessages,
  setValidatorRule,
  setValidating,
  setSubmitting,
  setLoading,
  createChildrenFeedbackFilter,
  queryFeedbacks,
} from '../shared/internals'

import type { Form } from './Form'
import { Query } from './Query'
import type { ArrayField, Field, ObjectField } from './index'

type FeedbackMessage = string[]

interface IFieldActions {
  [key: string]: (...args: any[]) => any
}
interface IFieldRequests {
  validate?: number
  submit?: number
  loading?: number
  batch?: () => void
}

export abstract class BaseField<Component extends JSXComponent = any, ValueType = any> {
  protected _display: FieldDisplayTypes = 'visible'

  protected _pattern: FieldPatternTypes = 'editable'

  initialized: boolean = false

  mounted: boolean = false

  unmounted: boolean = false

  data: any

  componentType!: Component

  componentProps!: Record<string, any>

  loading: boolean = false

  validating: boolean = false

  submitting: boolean = false

  active: boolean = false

  visited: boolean = false

  dataSource?: FieldDataSource

  validator!: FieldValidator

  feedbacks: IFieldFeedback[] = []

  path!: FormPath

  form: Form

  /**
   * reaction 的 dispose 函数会缓存在这里，派生类注册 reaction 时需要把 dispose 函数缓存进来
   * 由 base 类负责销毁 field 逻辑
   */
  disposers: IReactionDisposer[] = []

  /** 字段模型注入的可执行方法，目前没啥用 */
  #actions: IFieldActions = {}

  /** 仅用来标记状态变更 */
  requests: IFieldRequests = {}

  constructor(path: FormPathPattern, props: IBaseFieldProps<Component, ValueType>, form: Form) {
    this.form = form
    this.initialize(props)
    this.onInit()
  }

  protected initialize(props: IBaseFieldProps<Component, ValueType>) {
    /** 下面一串值可以是空，函数内部有冗余判空逻辑 */
    // @ts-expect-error
    this.setDisplay(props.display)
    // @ts-expect-error
    this.setPattern(props.pattern)
    // @ts-expect-error
    this.editable = props.editable
    // @ts-expect-error
    this.disabled = props.disabled
    // @ts-expect-error
    this.readPretty = props.readPretty
    // @ts-expect-error
    this.visible = props.visible
    // @ts-expect-error
    this.hidden = props.hidden
    // @ts-expect-error
    this.setDataSource(props.dataSource)
    // @ts-expect-error
    this.setRequired(props.required)
    // @ts-expect-error
    this.component = props.component
    this.setData(props.data)
    // @ts-expect-error
    this.setValidator(props.validator)
    if (props.initialValue !== undefined) {
      this.initialValue = props.initialValue
    }
    if (props.value !== undefined) {
      this.value = props.value
    }
  }

  get parent(): Field | ArrayField | ObjectField | undefined {
    let parent = this.path.parent()
    let identifier = parent.toString()
    while (!this.form.fields[identifier]) {
      parent = parent.parent()
      identifier = parent.toString()
      if (!identifier) return undefined
    }
    return this.form.fields[identifier]
  }

  get component() {
    return [this.componentType, this.componentProps]
  }

  set component(component: FieldComponent<Component>) {
    if (!isValid(component)) return
    // eslint-disable-next-line prefer-destructuring
    this.componentType = component[0]
    this.componentProps = component[1] || {}
  }

  get display() {
    return this._display
  }

  set display(type: FieldDisplayTypes) {
    this.setDisplay(type)
  }

  get pattern() {
    return this._pattern
  }

  set pattern(type: FieldPatternTypes) {
    this.setPattern(type)
  }

  get hidden() {
    return this.display === 'hidden'
  }

  set hidden(hidden: boolean) {
    if (!isValid(hidden)) return
    if (hidden) {
      this.display = 'hidden'
    } else {
      this.display = 'visible'
    }
  }

  get visible() {
    return this.display === 'visible'
  }

  set visible(visible: boolean) {
    if (!isValid(visible)) return
    if (visible) {
      this.display = 'visible'
    } else {
      this.display = 'none'
    }
  }

  get editable() {
    return this.pattern === 'editable'
  }

  set editable(editable: boolean) {
    if (!isValid(editable)) return
    if (editable) {
      this.pattern = 'editable'
    } else {
      this.pattern = 'readPretty'
    }
  }

  get disabled() {
    return this.pattern === 'disabled'
  }

  set disabled(disabled: boolean) {
    if (!isValid(disabled)) return
    if (disabled) {
      this.pattern = 'disabled'
    } else {
      this.pattern = 'editable'
    }
  }

  get readPretty() {
    return this.pattern === 'readPretty'
  }

  set readPretty(readPretty: boolean) {
    if (!isValid(readPretty)) return
    if (readPretty) {
      this.pattern = 'readPretty'
    } else {
      this.pattern = 'editable'
    }
  }

  get selfErrors(): FeedbackMessage {
    return queryFeedbackMessages(this, {
      type: 'error',
    })
  }

  set selfErrors(messages: FeedbackMessage) {
    this.setFeedback({
      type: 'error',
      code: 'EffectError',
      messages,
    })
  }

  get errors(): IFormFeedback[] {
    return this.form.errors.filter(createChildrenFeedbackFilter(this))
  }

  get selfWarnings(): FeedbackMessage {
    return queryFeedbackMessages(this, {
      type: 'warning',
    })
  }

  set selfWarnings(messages: FeedbackMessage) {
    this.setFeedback({
      type: 'warning',
      code: 'EffectWarning',
      messages,
    })
  }

  get warnings(): IFormFeedback[] {
    return this.form.warnings.filter(createChildrenFeedbackFilter(this))
  }

  get selfSuccesses(): FeedbackMessage {
    return queryFeedbackMessages(this, {
      type: 'success',
    })
  }

  set selfSuccesses(messages: FeedbackMessage) {
    this.setFeedback({
      type: 'success',
      code: 'EffectSuccess',
      messages,
    })
  }

  get successes(): IFormFeedback[] {
    return this.form.successes.filter(createChildrenFeedbackFilter(this))
  }

  get selfValid() {
    return !this.selfErrors.length
  }

  get valid() {
    return !this.errors.length
  }

  get selfInvalid() {
    return !this.selfValid
  }

  get invalid() {
    return !this.valid
  }

  get value(): ValueType {
    return this.form.getValuesIn(this.path)
  }

  set value(value: ValueType) {
    this.setValue(value)
  }

  get initialValue(): ValueType {
    return this.form.getInitialValuesIn(this.path)
  }

  set initialValue(initialValue: ValueType) {
    this.setInitialValue(initialValue)
  }

  get required() {
    const validators = isArr(this.validator) ? this.validator : parseValidatorDescriptions(this.validator)
    // @ts-expect-error TS(2339)
    return validators.some((desc) => !!desc?.required)
  }

  set required(required: boolean) {
    if (this.required === required) return
    this.setValidatorRule('required', required)
  }

  get validateStatus() {
    if (this.validating) return 'validating'
    if (this.selfInvalid) return 'error'
    if (this.selfWarnings.length) return 'warning'
    if (this.selfSuccesses.length) return 'success'
    return undefined
  }

  get destroyed() {
    return !this.form.fields[this.path.toString()]
  }

  /** form 中挂载 field */
  protected locate<F extends Field>(path: FormPathPattern, field: F) {
    this.form.fields[path.toString()] = field as any
    locateNode(field, path)
  }

  setValue(value: ValueType) {
    if (this.destroyed) return
    if (this.display === 'none') {
      return
    }
    this.form.setValuesIn(this.path, value)
  }

  setInitialValue(initialValue?: ValueType) {
    if (this.destroyed || this.initialValue || initialValue === undefined) return
    this.form.setInitialValuesIn(this.path, initialValue)
  }

  setDisplay(type: FieldDisplayTypes) {
    if (!isValid(type)) return
    if (type === 'none') {
      this.form.deleteValuesIn(this.path)
    }
    if (type === 'none' || type === 'hidden') {
      this.setFeedback({ type: 'error', messages: [] })
    }
    this._display = type
  }

  setPattern(type: FieldPatternTypes) {
    if (!isValid(type)) return
    if (type !== 'editable') {
      this.setFeedback({ type: 'error', messages: [] })
    }
    this._pattern = type
  }

  setLoading(loading: boolean) {
    setLoading(this, loading)
  }

  setValidating(validating: boolean) {
    setValidating(this, validating)
  }

  setSubmitting(submitting: boolean) {
    setSubmitting(this, submitting)
  }

  setComponent<C extends JSXComponent, ComponentProps extends object = object>(component: C, props?: ComponentProps) {
    if (component) {
      this.componentType = component as any
    }
    if (props) {
      this.componentProps = this.componentProps || {}
      Object.assign(this.componentProps, props)
    }
  }

  setComponentProps<ComponentProps extends object = object>(props: ComponentProps) {
    if (props) {
      this.componentProps = this.componentProps || {}
      Object.assign(this.componentProps, props)
    }
  }

  setData(data: any) {
    this.data = data
  }

  setDataSource(dataSource: FieldDataSource) {
    if (!isValid(dataSource)) return
    this.dataSource = dataSource
  }

  setFeedback(feedback: IFieldFeedback) {
    if (!isValid(feedback)) return
    updateFeedback(this, feedback)
  }

  setSelfErrors(messages: FeedbackMessage) {
    if (!isValid(messages)) return
    this.selfErrors = messages
  }

  setSelfWarnings(messages: FeedbackMessage) {
    if (!isValid(messages)) return
    this.selfWarnings = messages
  }

  setSelfSuccesses(messages: FeedbackMessage) {
    if (!isValid(messages)) return
    this.selfSuccesses = messages
  }

  setValidator(validator: FieldValidator) {
    if (!isValid(validator)) return
    this.validator = validator
  }

  setValidatorRule(name: string, value: any) {
    setValidatorRule(this, name, value)
  }

  setRequired(required: boolean) {
    if (!isValid(required)) return
    this.required = required
  }

  onInit() {
    this.initialized = true
    this.notify(LifeCycleTypes.ON_FIELD_INIT)
  }

  onMount() {
    this.mounted = true
    this.unmounted = false
    this.notify(LifeCycleTypes.ON_FIELD_MOUNT)
  }

  onUnmount() {
    this.mounted = false
    this.unmounted = true
    this.notify(LifeCycleTypes.ON_FIELD_UNMOUNT)
  }

  query(pattern: FormPathPattern | RegExp) {
    return new Query({
      pattern,
      base: this.path,
      form: this.form,
    })
  }

  queryFeedbacks(search: ISearchFeedback): IFieldFeedback[] {
    return queryFeedbacks(this, search)
  }

  // 父组件负责实现，因为需要在 notify 执行时上报 field 实例
  abstract notify(type: LifeCycleTypes, payload?: any): void

  dispose() {
    this.disposers.forEach((dispose) => dispose())
  }

  destroy(forceClear = true) {
    destroy(this.form.fields, this.path.toString(), forceClear)
  }

  inject(actions: IFieldActions) {
    Object.entries(actions).forEach(([key, action]) => {
      if (isFn(action)) {
        this.#actions[key] = action
      }
    })
  }

  invoke(name: string, ...args: any[]) {
    return this.#actions[name]?.(...args)
  }
}
