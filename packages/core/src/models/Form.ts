/* eslint-disable no-new */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { merge } from '@formily/shared/esm/merge'
import { isValid, isPlainObj, isFn } from '@astro-form/shared'
import structuredClone from '@ungap/structured-clone'
import { makeObservable, observable, computed, action, toJS, reaction } from 'mobx'

import {
  JSXComponent,
  LifeCycles,
  FormPatternTypes,
  IFormFeedback,
  ISearchFeedback,
  IFormProps,
  IFieldResetOptions,
  IFormFields,
  IFieldFactoryProps,
  FormDisplayTypes,
  FormLifeCycleUnion,
  FieldLifeCycleUnion,
  FieldFeedbackTypes,
  FormPath,
  FormPathPattern,
} from '../types'
import { batchValidate } from '../shared/internals'

import { Field } from './Field'
import { ArrayField } from './ArrayField'
import { ObjectField } from './ObjectField'
import { LifeCycle } from './LifeCycle'
import { Query } from './Query'

type IFormMergeStrategy = 'overwrite' | 'merge' | 'shallowMerge'

const EffectId = '__initial_effect__'
export class Form<ValueType extends object = any> {
  displayName = 'Form'

  private _self: {
    initialized: boolean
    mounted: boolean
    unmounted: boolean
    display: FormDisplayTypes
    pattern: FormPatternTypes
    loading: boolean
    validating: boolean
    submitting: boolean
    values: ValueType
    initialValues: Partial<ValueType>
  } = {
    initialized: false,
    mounted: false,
    unmounted: false,
    display: 'visible',
    pattern: 'editable',
    loading: false,
    validating: false,
    submitting: false,
    values: {} as any,
    initialValues: {},
  }

  private _lifecycle = new LifeCycle()

  private disposers: (() => void)[] = []

  modified: boolean = false

  // 直接修改即可，无需劫持 因此无需定义 getter setter
  validateFirst?: boolean = undefined

  fields: IFormFields = {}

  indexes: Record<string, string> = {}

  constructor(props: IFormProps<ValueType>) {
    this.#initialize(props)
    this.#makeObservable()
    this.#makeReactive()
    if (props.effects) {
      this.addEffects(EffectId, props.effects)
    }
    this.notify(LifeCycles.ON_FORM_INIT)
  }

  #initialize(props: IFormProps<ValueType>) {
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
    if (isValid(props.validateFirst)) {
      this.validateFirst = props.validateFirst
    }
    this.values = structuredClone(props.values || {})
    this.initialValues = structuredClone(props.initialValues || {})
    this._self.initialized = true
  }

  #makeObservable() {
    makeObservable<Form, '_self'>(this, {
      _self: observable,
      modified: observable.ref,
      validateFirst: observable.ref,
      fields: observable.shallow,
      indexes: observable.shallow,
      initialized: computed,
      mounted: computed,
      unmounted: computed,
      pattern: computed,
      display: computed,
      hidden: computed,
      visible: computed,
      editable: computed,
      disabled: computed,
      readPretty: computed,
      loading: computed,
      validating: computed,
      submitting: computed,
      values: computed,
      initialValues: computed,
      errors: computed,
      warnings: computed,
      successes: computed,
      valid: computed,
      invalid: computed,

      setValues: action,
      setValuesIn: action,
      setInitialValues: action,
      setInitialValuesIn: action,
      deleteValuesIn: action,
      deleteInitialValuesIn: action,
      setDisplay: action,
      setPattern: action,
      setLoading: action,
      setValidating: action,
      setSubmitting: action,
      clearErrors: action,
      clearWarnings: action,
      clearSuccesses: action,
      onMount: action,
      onUnmount: action,
    })
  }

  #makeReactive() {
    /**
     * 为啥不在 setValues setInitialValues 等函数体内触发这里的hook
     * 是因为用户可能通过 form.values.a = 123 这种方式修改 values，而这种情况下是没有办法触发 setValue 的。
     * 因此必须监听 values 变化。
     * 其实 field 中的 ON_FIELD_VALUES_CHANGE 和 ON_FIELD_INITIAL_VALUES_CHANGE 也应该采用这种方式
     * 但目前先不改了，这种情况应该属于少数case
     */
    this.disposers.push(
      reaction(
        // 必须调用 toJS，否则 values 中某个属性变化时 reaction 函数并不会触发执行
        () => toJS(this.values),
        () => {
          if (this.initialized) {
            this.notify(LifeCycles.ON_FORM_VALUES_CHANGE)
          }
        }
      ),
      reaction(
        () => toJS(this.initialValues),
        () => {
          if (this.initialized) {
            this.notify(LifeCycles.ON_FORM_INITIAL_VALUES_CHANGE)
          }
        }
      )
    )
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

  get display() {
    return this._self.display
  }

  set display(type: FormDisplayTypes) {
    this.setDisplay(type)
  }

  get pattern() {
    return this._self.pattern
  }

  set pattern(type: FormPatternTypes) {
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

  get errors() {
    return this.queryFeedbacks({
      type: 'error',
    })
  }

  get warnings() {
    return this.queryFeedbacks({
      type: 'warning',
    })
  }

  get successes() {
    return this.queryFeedbacks({
      type: 'success',
    })
  }

  get valid() {
    return !this.invalid
  }

  get invalid() {
    return this.errors.length > 0
  }

  get values() {
    return this._self.values
  }

  set values(values: any) {
    this.setValues(values)
  }

  get initialValues() {
    return this._self.initialValues
  }

  set initialValues(initialValues: any) {
    this.setInitialValues(initialValues)
  }

  /** 创建字段 * */

  createField<Component extends JSXComponent, T = any>(
    props: IFieldFactoryProps<Component, T>
  ): Field<Component, T> | undefined {
    const path = FormPath.parse(props.basePath).concat(props.name)
    const identifier = path.toString()
    if (!identifier) return undefined

    if (!this.fields[identifier]) {
      const v = this.getValuesIn(path)
      const initialV = this.getInitialValuesIn(path)
      const value = (() => {
        if (props.value !== undefined) return props.value
        if (v !== undefined) return v
        return undefined
      })()
      const initialValue = (() => {
        if (props.initialValue !== undefined) return props.initialValue
        if (initialV !== undefined) return initialV
        return undefined
      })()
      // eslint-disable-next-line no-param-reassign
      props.value = value
      // eslint-disable-next-line no-param-reassign
      props.initialValue = initialValue
      new Field(path, props, this)
      this.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)
    }
    return this.fields[identifier] as Field
  }

  createArrayField<Component extends JSXComponent, T extends any[] = any[]>(
    props: IFieldFactoryProps<Component, T>
  ): ArrayField<Component, T> | undefined {
    const path = FormPath.parse(props.basePath).concat(props.name)
    const identifier = path.toString()
    if (!identifier) return undefined
    if (!this.fields[identifier]) {
      new ArrayField(path, props, this)
      this.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)
    }
    return this.fields[identifier] as any
  }

  createObjectField<Component extends JSXComponent, T extends object = object>(
    props: IFieldFactoryProps<Component, T>
  ): ObjectField<Component, T> | undefined {
    const path = FormPath.parse(props.basePath).concat(props.name)
    const identifier = path.toString()
    if (!identifier) return undefined
    if (!this.fields[identifier]) {
      new ObjectField(path, props, this)
      this.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)
    }
    return this.fields[identifier] as any
  }

  /** 状态操作模型 * */

  setValues(values: any, strategy: IFormMergeStrategy = 'merge') {
    if (!isPlainObj(values)) return
    if (strategy === 'merge') {
      merge(this._self.values, values, {
        // never reach
        arrayMerge: (target, source) => source,
        assign: true,
      })
    } else if (strategy === 'shallowMerge') {
      Object.assign(this._self.values, values)
    } else {
      this._self.values = values as any
    }
  }

  setValuesIn(pattern: FormPathPattern, value: any) {
    FormPath.setIn(this._self.values, pattern, value)
  }

  setInitialValues(initialValues: any, strategy: IFormMergeStrategy = 'merge') {
    if (!isPlainObj(initialValues)) return
    if (strategy === 'merge') {
      merge(this._self.initialValues, initialValues, {
        // never reach
        arrayMerge: (target, source) => source,
        assign: true,
      })
    } else if (strategy === 'shallowMerge') {
      Object.assign(this._self.initialValues, initialValues)
    } else {
      this._self.initialValues = initialValues as any
    }
  }

  setInitialValuesIn(pattern: FormPathPattern, initialValue: any) {
    FormPath.setIn(this._self.initialValues, pattern, initialValue)
  }

  deleteValuesIn(pattern: FormPathPattern) {
    FormPath.deleteIn(this._self.values, pattern)
  }

  existValuesIn(pattern: FormPathPattern) {
    return FormPath.existIn(this.values, pattern)
  }

  getValuesIn(pattern: FormPathPattern) {
    return toJS(FormPath.getIn(this.values, pattern))
  }

  deleteInitialValuesIn(pattern: FormPathPattern) {
    FormPath.deleteIn(this._self.initialValues, pattern)
  }

  existInitialValuesIn(pattern: FormPathPattern) {
    return FormPath.existIn(this.initialValues, pattern)
  }

  getInitialValuesIn(pattern: FormPathPattern) {
    return toJS(FormPath.getIn(this.initialValues, pattern))
  }

  setDisplay(display: FormDisplayTypes) {
    if (!isValid(display)) return
    const oldDisplay = this.display
    this._self.display = display
    const actualDisplay = this.display
    if (actualDisplay === 'none') {
      // 当前节点及子节点value清空
      this.deleteValuesIn('*')
    }

    if (oldDisplay !== actualDisplay && oldDisplay === 'none') {
      this.query('*').forEach((field) => {
        if (!field.selfModified) {
          // eslint-disable-next-line no-param-reassign
          field.value = field.initialValue
        }
      })
    }
    if (actualDisplay === 'hidden' || actualDisplay === 'none') {
      this.clearErrors()
    }
  }

  setPattern(pattern: FormPatternTypes) {
    if (!isValid(pattern)) return
    this._self.pattern = pattern
    const actualPattern = this.pattern
    if (actualPattern !== 'editable') {
      this.clearErrors()
    }
  }

  setLoading(loading: boolean) {
    if (!isValid(loading)) return
    const preloading = this.loading
    this._self.loading = loading
    if (preloading !== this.loading) {
      this.notify(LifeCycles.ON_FORM_LOADING)
    }
  }

  setValidating(validating: boolean) {
    if (!isValid(validating)) return
    const prevalidating = this.validating
    this._self.validating = validating
    if (prevalidating !== this.validating) {
      if (this.validating) {
        this.notify(LifeCycles.ON_FORM_VALIDATE_START)
        this.notify(LifeCycles.ON_FORM_VALIDATING)
      } else {
        this.notify(LifeCycles.ON_FORM_VALIDATE_END)
      }
    }
  }

  setSubmitting(submitting: boolean) {
    if (!isValid(submitting)) return
    const presubmitting = this.submitting
    this._self.submitting = submitting
    if (presubmitting !== this.submitting) {
      if (this.submitting) {
        this.notify(LifeCycles.ON_FORM_SUBMIT_START)
        this.notify(LifeCycles.ON_FORM_SUBMITTING)
      } else {
        this.notify(LifeCycles.ON_FORM_SUBMIT_END)
      }
    }
  }

  clearErrors(pattern: FormPathPattern = '*') {
    this.query(pattern).forEach((field) => {
      field.setFeedback({
        type: 'error',
        messages: [],
      })
    })
  }

  clearWarnings(pattern: FormPathPattern = '*') {
    this.query(pattern).forEach((field) => {
      field.setFeedback({
        type: 'warning',
        messages: [],
      })
    })
  }

  clearSuccesses(pattern: FormPathPattern = '*') {
    this.query(pattern).forEach((field) => {
      field.setFeedback({
        type: 'success',
        messages: [],
      })
    })
  }

  addEffects(id: string, effects: (form: Form) => void) {
    this._lifecycle.addEffects(id, () => effects(this))
  }

  removeEffects(id: string) {
    this._lifecycle.removeEffects(id)
  }

  on(
    ...args:
      | [FormLifeCycleUnion, (form: Form) => void]
      | [FieldLifeCycleUnion, FormPathPattern, (field: Field, form: Form) => void]
  ) {
    const [lifecycle] = args
    switch (lifecycle) {
      case LifeCycles.ON_FORM_INIT:
      case LifeCycles.ON_FORM_MOUNT:
      case LifeCycles.ON_FORM_UNMOUNT:
      case LifeCycles.ON_FORM_INPUT_CHANGE:
      case LifeCycles.ON_FORM_VALUES_CHANGE:
      case LifeCycles.ON_FORM_INITIAL_VALUES_CHANGE:
      case LifeCycles.ON_FORM_SUBMIT:
      case LifeCycles.ON_FORM_RESET:
      case LifeCycles.ON_FORM_SUBMIT_START:
      case LifeCycles.ON_FORM_SUBMITTING:
      case LifeCycles.ON_FORM_SUBMIT_END:
      case LifeCycles.ON_FORM_SUBMIT_VALIDATE_START:
      case LifeCycles.ON_FORM_SUBMIT_VALIDATE_SUCCESS:
      case LifeCycles.ON_FORM_SUBMIT_VALIDATE_FAILED:
      case LifeCycles.ON_FORM_SUBMIT_VALIDATE_END:
      case LifeCycles.ON_FORM_SUBMIT_SUCCESS:
      case LifeCycles.ON_FORM_SUBMIT_FAILED:
      case LifeCycles.ON_FORM_VALIDATE_START:
      case LifeCycles.ON_FORM_VALIDATING:
      case LifeCycles.ON_FORM_VALIDATE_SUCCESS:
      case LifeCycles.ON_FORM_VALIDATE_FAILED:
      case LifeCycles.ON_FORM_VALIDATE_END:
      case LifeCycles.ON_FORM_GRAPH_CHANGE:
      case LifeCycles.ON_FORM_LOADING:
        this._lifecycle.registerLifeCycleSubscriber({
          type: lifecycle,
          cb: () => args[1](this),
        })
        break
      case LifeCycles.ON_FIELD_INIT:
      case LifeCycles.ON_FIELD_INPUT_VALUE_CHANGE:
      case LifeCycles.ON_FIELD_VALUE_CHANGE:
      case LifeCycles.ON_FIELD_INITIAL_VALUE_CHANGE:
      case LifeCycles.ON_FIELD_SUBMIT:
      case LifeCycles.ON_FIELD_SUBMIT_START:
      case LifeCycles.ON_FIELD_SUBMITTING:
      case LifeCycles.ON_FIELD_SUBMIT_END:
      case LifeCycles.ON_FIELD_SUBMIT_VALIDATE_START:
      case LifeCycles.ON_FIELD_SUBMIT_VALIDATE_SUCCESS:
      case LifeCycles.ON_FIELD_SUBMIT_VALIDATE_FAILED:
      case LifeCycles.ON_FIELD_SUBMIT_VALIDATE_END:
      case LifeCycles.ON_FIELD_SUBMIT_SUCCESS:
      case LifeCycles.ON_FIELD_SUBMIT_FAILED:
      case LifeCycles.ON_FIELD_VALIDATE_START:
      case LifeCycles.ON_FIELD_VALIDATING:
      case LifeCycles.ON_FIELD_VALIDATE_SUCCESS:
      case LifeCycles.ON_FIELD_VALIDATE_FAILED:
      case LifeCycles.ON_FIELD_VALIDATE_END:
      case LifeCycles.ON_FIELD_LOADING:
      case LifeCycles.ON_FIELD_RESET:
      case LifeCycles.ON_FIELD_MOUNT:
      case LifeCycles.ON_FIELD_UNMOUNT:
        this._lifecycle.registerLifeCycleSubscriber({
          type: lifecycle,
          cb: (field) => {
            if (FormPath.parse(args[1]).match(field.path)) {
              args[2](field, this)
            }
          },
        })
        break
      default:
        throw Error('not implemented lifecycle')
    }
  }

  query(pattern: FormPathPattern): Query {
    return new Query({
      pattern,
      base: '',
      form: this,
    })
  }

  queryFeedbacks(search: ISearchFeedback): IFormFeedback[] {
    return this.query(search.path || '*').reduce<IFormFeedback[]>((messages, field) => {
      return messages.concat(
        field
          .queryFeedbacks(search)
          .map((feedback) => ({
            ...feedback,
            path: field.path.toString(),
          }))
          .filter((feedback) => feedback.messages.length > 0)
      )
    }, [])
  }

  /** 清空所有 field 的 feedback */
  clearFeedback(type: FieldFeedbackTypes) {
    if (!isValid(type)) return
    this.query('*').forEach((_field) => {
      _field.setFeedback({
        type,
        messages: [],
      })
    })
  }

  notify(type: string, payload?: Field | any) {
    this._lifecycle.emit({ type, payload: payload ?? this })
  }

  /** 事件钩子* */

  onMount() {
    this._self.mounted = true
    this.notify(LifeCycles.ON_FORM_MOUNT)
  }

  onUnmount() {
    this.notify(LifeCycles.ON_FORM_UNMOUNT)
    this.query('*').forEach((field) => field.destroy(false))
    this.disposers.forEach((dispose) => dispose())
    this.removeEffects(EffectId)
    this._self.unmounted = true
    this.indexes = {}
  }

  async validate(pattern: FormPathPattern = '*') {
    await batchValidate(this, pattern)
  }

  async submit<T>(onSubmit?: (values: ValueType) => Promise<T> | void): Promise<T> {
    this.setSubmitting(true)
    try {
      this.notify(LifeCycles.ON_FORM_SUBMIT_VALIDATE_START)
      await this.validate()
      this.notify(LifeCycles.ON_FORM_SUBMIT_VALIDATE_SUCCESS)
    } catch (e) {
      this.notify(LifeCycles.ON_FORM_SUBMIT_VALIDATE_FAILED)
    }
    this.notify(LifeCycles.ON_FORM_SUBMIT_VALIDATE_END)
    let results: any
    try {
      if (this.invalid) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw this.errors
      }
      if (isFn(onSubmit)) {
        results = await onSubmit(toJS(this.values))
      } else {
        results = toJS(this.values)
      }
      this.notify(LifeCycles.ON_FORM_SUBMIT_SUCCESS)
    } catch (e) {
      this.setSubmitting(false)
      this.notify(LifeCycles.ON_FORM_SUBMIT_FAILED)
      this.notify(LifeCycles.ON_FORM_SUBMIT)
      throw e
    }
    this.setSubmitting(false)
    this.notify(LifeCycles.ON_FORM_SUBMIT)
    return results
  }

  async reset(pattern: FormPathPattern = '*', options?: IFieldResetOptions) {
    const tasks: Array<Promise<any>> = []
    this.query(pattern).forEach((field) => {
      tasks.push(field.resetSelf(options))
    })
    this.modified = false
    this.notify(LifeCycles.ON_FORM_RESET)
    await Promise.all(tasks)
  }
}
