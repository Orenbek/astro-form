/* eslint-disable @typescript-eslint/ban-ts-comment */
import { isValid, isFn, isArr, isEmpty } from '@astro-form/shared'
import { parseValidatorDescriptions } from '@formily/validator'
import { runInAction, type IReactionDisposer } from 'mobx'

import type {
  JSXComponent,
  FieldDisplayTypes,
  FieldPatternTypes,
  FieldComponent,
  FieldValidator,
  FieldDataSource,
  IFieldFeedback,
  IFormFeedback,
  ISearchFeedback,
  IBaseFieldProps,
  FieldFeedbackTypes,
  FormPathPattern,
} from '../types'
import { LifeCycles, FormPath } from '../types'
import { updateFeedback, setValidatorRule, createChildrenFeedbackFilter, queryFeedbacks } from '../shared/internals'

import type { Form } from './Form'
import { Query } from './Query'
import type { ArrayField, Field, ObjectField } from './index'

type FeedbackMessage = string[]

interface IFieldActions {
  [key: string]: (...args: any[]) => any
}

type SelfField = {
  form: Form
  path: FormPath
  initialized: boolean
  mounted: boolean
  unmounted: boolean
  selfModified: boolean
  display: FieldDisplayTypes
  pattern: FieldPatternTypes
  loading: boolean
  validating: boolean
  submitting: boolean
  feedbacks: IFieldFeedback[]
}

export class BaseField<Component extends JSXComponent = any, ValueType = any> {
  protected _self: SelfField = {
    form: undefined as any,
    path: undefined as any,
    initialized: false,
    mounted: false,
    unmounted: false,
    selfModified: false,
    display: 'visible',
    pattern: 'editable',
    loading: false,
    validating: false,
    submitting: false,
    feedbacks: [],
  }

  data: any = undefined

  componentType: Component = undefined as any

  componentProps: Record<string, any> = undefined as any

  /** 字段校验是否只校验第一个非法规则 */
  validateFirst?: boolean = undefined

  dataSource?: FieldDataSource = undefined

  validator?: FieldValidator = undefined

  /**
   * reaction 的 dispose 函数会缓存在这里，派生类注册 reaction 时需要把 dispose 函数缓存进来
   * 由 base 类负责销毁 field 逻辑
   */
  protected disposers: IReactionDisposer[] = []

  /** 字段模型注入的可执行方法，目前没啥用 */
  #actions: IFieldActions = {}

  constructor(path: FormPathPattern, props: IBaseFieldProps<Component, ValueType>, form: Form) {
    this._self.form = form
    const _path = FormPath.parse(path)
    this._self.path = _path
    runInAction(() => {
      this.form.fields[_path.toString()] = this as any
      this.form.indexes[_path.toString()] = _path.toString()
    })
    this.#initialize(props)
  }

  #initialize(props: IBaseFieldProps<Component, ValueType>) {
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
    // setValidator 需要在 setRequired 之前
    // @ts-expect-error
    this.setValidator(props.validator)
    // @ts-expect-error
    this.setRequired(props.required)
    // @ts-expect-error
    this.component = props.component
    this.setData(props.data)

    if (props.initialValue !== undefined) {
      this.initialValue = props.initialValue
    }
    if (props.value !== undefined) {
      this.value = props.value
    } else if (props.initialValue !== undefined) {
      this.value = props.initialValue
    }
    if (isValid(props.validateFirst)) {
      this.validateFirst = props.validateFirst
    }

    this._self.initialized = true
    this.notify(LifeCycles.ON_FIELD_INIT)
  }

  get form() {
    return this._self.form
  }

  get path() {
    return this._self.path
  }

  get initialized() {
    return this._self.initialized
  }

  get mounted() {
    return this._self.mounted
  }

  get unmounted() {
    return this._self.unmounted
  }

  /** 字段自身是否被手动修改过 */
  get selfModified() {
    return this._self.selfModified
  }

  /** 字段子树是否被手动修改过 */
  get modified() {
    if (this.selfModified) return true
    return this.query(`${this.path}.*`).reduce<boolean>((_modified, _field) => _modified || _field.selfModified, false)
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

  get display() {
    const parentDisplay = this.parent ? this.parent.display : this.form.display
    if (parentDisplay === 'none') return 'none'
    if (parentDisplay === 'hidden') {
      if (this._self.display === 'none') return 'none'
      return 'hidden'
    }
    return this._self.display
  }

  set display(type: FieldDisplayTypes) {
    this.setDisplay(type)
  }

  get pattern() {
    const parentPattern = this.parent ? this.parent.pattern : this.form.pattern
    if (parentPattern === 'disabled') return 'disabled'
    if (parentPattern === 'readPretty') {
      if (this._self.pattern === 'disabled') return 'disabled'
      return 'readPretty'
    }
    return this._self.pattern
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

  get loading() {
    return this._self.loading
  }

  set loading(loading: boolean) {
    this.setLoading(loading)
  }

  get validating() {
    return this._self.validating
  }

  set validating(validating: boolean) {
    this.setValidating(validating)
  }

  get submitting() {
    return this._self.submitting
  }

  set submitting(submiting: boolean) {
    this.setSubmitting(submiting)
  }

  get feedbacks() {
    return this._self.feedbacks
  }

  get selfErrors(): FeedbackMessage {
    return this.queryFeedbackMessages({ type: 'error' })
  }

  set selfErrors(messages: FeedbackMessage) {
    this.setSelfErrors(messages)
  }

  get errors(): IFormFeedback[] {
    return this.form.errors.filter(createChildrenFeedbackFilter(this))
  }

  get selfWarnings(): FeedbackMessage {
    return this.queryFeedbackMessages({ type: 'warning' })
  }

  set selfWarnings(messages: FeedbackMessage) {
    this.setSelfWarnings(messages)
  }

  get warnings(): IFormFeedback[] {
    return this.form.warnings.filter(createChildrenFeedbackFilter(this))
  }

  get selfSuccesses(): FeedbackMessage {
    return this.queryFeedbackMessages({ type: 'success' })
  }

  set selfSuccesses(messages: FeedbackMessage) {
    this.setSelfSuccesses(messages)
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

  get component() {
    return [this.componentType, this.componentProps]
  }

  set component(component: FieldComponent<Component>) {
    if (!isValid(component)) return
    // eslint-disable-next-line prefer-destructuring
    this.componentType = component[0]
    this.componentProps = component[1] || {}
  }

  get required() {
    if (!this.validator) return false
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

  // get index() {
  //   if (this.parent instanceof ArrayField) {
  //     const path = FormPath.parse(this.path)
  //     return Number(path.segments[path.segments.length - 1])
  //   }
  //   return -1
  // }

  setValue(value: ValueType) {
    if (this.destroyed) return
    if (this.display === 'none') {
      return
    }
    this.form.setValuesIn(this.path, value)
  }

  setInitialValue(initialValue?: ValueType) {
    if (this.destroyed) return
    this.form.setInitialValuesIn(this.path, initialValue)
  }

  setDisplay(type: FieldDisplayTypes) {
    if (!isValid(type)) return
    const oldDisplay = this.display
    this._self.display = type
    const actualDisplay = this.display
    if (actualDisplay === 'none') {
      // 当前节点及子节点value清空
      this.form.deleteValuesIn(this.path)
    }

    if (oldDisplay !== actualDisplay && oldDisplay === 'none') {
      // 恢复 display 为非 none 时，需要设置当前节点及子节点默认值
      // 需要将当前节点及子节点 initialValue 都赋值给 value
      if (!this.selfModified) {
        this.value = this.initialValue
      }
      this.query(`${this.path}.*`).forEach((field) => {
        if (!field.selfModified) {
          // eslint-disable-next-line no-param-reassign
          field.setValue(field.initialValue)
        }
      })
    }

    if (actualDisplay === 'hidden' || actualDisplay === 'none') {
      this.clearFeedback('error')
    }
  }

  setPattern(type: FieldPatternTypes) {
    if (!isValid(type)) return
    this._self.pattern = type
    const actualPattern = this.pattern
    if (actualPattern !== 'editable') {
      this.clearFeedback('error')
    }
  }

  setLoading(loading: boolean) {
    if (!isValid(loading)) return
    const preloading = this.loading
    this._self.loading = loading
    if (preloading !== this.loading) {
      this.notify(LifeCycles.ON_FIELD_LOADING)
    }
  }

  setValidating(validating: boolean) {
    if (!isValid(validating)) return
    const prevalidating = this.validating
    this._self.validating = validating
    if (prevalidating !== this.validating) {
      if (this.validating) {
        this.notify(LifeCycles.ON_FIELD_VALIDATE_START)
        this.notify(LifeCycles.ON_FIELD_VALIDATING)
      } else {
        this.notify(LifeCycles.ON_FIELD_VALIDATE_END)
      }
    }
  }

  setSubmitting(submitting: boolean) {
    if (!isValid(submitting)) return
    const presubmitting = this.submitting
    this._self.submitting = submitting
    if (presubmitting !== this.submitting) {
      if (this.submitting) {
        this.notify(LifeCycles.ON_FIELD_SUBMIT_START)
        this.notify(LifeCycles.ON_FIELD_SUBMITTING)
      } else {
        this.notify(LifeCycles.ON_FIELD_SUBMIT_END)
      }
    }
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
    this.dataSource = dataSource
  }

  setFeedback(feedback: IFieldFeedback) {
    if (!isValid(feedback)) return
    this._self.feedbacks = updateFeedback(this, feedback)
  }

  /** 清空本 field 以及所有子 field 的 feedback */
  clearFeedback(type: FieldFeedbackTypes) {
    if (!isValid(type)) return
    this.setFeedback({
      type,
      messages: [],
    })
    this.query(`${this.path}.*`).forEach((_field) => {
      _field.setFeedback({
        type,
        messages: [],
      })
    })
  }

  setSelfErrors(messages: FeedbackMessage) {
    if (!isValid(messages)) return
    this.setFeedback({
      type: 'error',
      code: 'EffectError',
      messages,
    })
  }

  setSelfWarnings(messages: FeedbackMessage) {
    if (!isValid(messages)) return
    this.setFeedback({
      type: 'warning',
      code: 'EffectWarning',
      messages,
    })
  }

  setSelfSuccesses(messages: FeedbackMessage) {
    if (!isValid(messages)) return
    this.setFeedback({
      type: 'success',
      code: 'EffectSuccess',
      messages,
    })
  }

  setValidator(validator: FieldValidator) {
    this.validator = validator
  }

  setValidatorRule(name: string, value: any) {
    setValidatorRule(this, name, value)
  }

  setRequired(required: boolean) {
    if (!isValid(required)) return
    this.required = required
  }

  onMount() {
    this._self.mounted = true
    this._self.unmounted = false
    this.notify(LifeCycles.ON_FIELD_MOUNT)
  }

  onUnmount() {
    this._self.mounted = false
    this._self.unmounted = true
    this.notify(LifeCycles.ON_FIELD_UNMOUNT)
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

  private queryFeedbackMessages(search: ISearchFeedback) {
    if (!this.feedbacks.length) return []
    return this.queryFeedbacks(search).reduce<string[]>(
      (buf, info) => (isEmpty(info.messages) ? buf : buf.concat(info.messages)),
      []
    )
  }

  match = (pattern: FormPathPattern) => {
    return FormPath.parse(pattern).match(this.path)
  }

  notify(type: LifeCycles, payload?: any): void {
    this.form.notify(type, payload ?? this)
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
