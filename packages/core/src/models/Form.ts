/* eslint-disable no-new */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Path as FormPath, Pattern as FormPathPattern } from '@formily/path'
import { merge } from '@formily/shared/esm/merge'
import { isValid, isPlainObj } from '@astro-form/shared'
import structuredClone from '@ungap/structured-clone'
import { reaction, makeObservable, observable, computed, action, toJS } from 'mobx'

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
} from '../types'
import { batchValidate, batchReset, batchSubmit } from '../shared/internals'

import { Field } from './Field'
import { ArrayField } from './ArrayField'
import { ObjectField } from './ObjectField'
import { LifeCycle } from './LifeCycle'
import { Query } from './Query'

type IFormMergeStrategy = 'overwrite' | 'merge' | 'shallowMerge'

export class Form<ValueType extends object = any> {
  displayName = 'Form'

  private _pattern: FormPatternTypes = 'editable'

  private _display: FormDisplayTypes = 'visible'

  private _loading: boolean = false

  private _validating: boolean = false

  private _submitting: boolean = false

  private _lifecycle = new LifeCycle()

  private disposers: (() => void)[] = []

  initialized: boolean = false

  mounted: boolean = false

  unmounted: boolean = false

  modified: boolean = false

  validateFirst?: boolean

  values!: ValueType

  initialValues!: Partial<ValueType>

  fields: IFormFields = {}

  indexes: Record<string, string> = {}

  constructor(props: IFormProps<ValueType>) {
    this.initialize(props)
    this.#makeObservable()
    this.makeReactive()
    this.onInit()
  }

  protected initialize(props: IFormProps<ValueType>) {
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
    this.validateFirst = props.validateFirst
    this.values = structuredClone(props.values || {})
    this.initialValues = structuredClone(props.initialValues || {})
  }

  #makeObservable() {
    makeObservable<Form, '_display' | '_pattern' | '_loading' | '_validating' | '_submitting'>(this, {
      _display: observable.ref,
      _pattern: observable.ref,
      _loading: observable.ref,
      _validating: observable.ref,
      _submitting: observable.ref,

      initialized: observable.ref,
      mounted: observable.ref,
      unmounted: observable.ref,
      modified: observable.ref,
      validateFirst: observable.ref,
      values: observable,
      initialValues: observable,
      fields: observable.shallow,
      indexes: observable.shallow,
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
      onInit: action,
      onMount: action,
      onUnmount: action,
    })
  }

  protected makeReactive() {
    this.disposers.push(
      reaction(
        () => this.values,
        () => {
          if (this.initialized) {
            this.notify(LifeCycles.ON_FORM_VALUES_CHANGE)
          }
        }
      ),
      reaction(
        () => this.initialValues,
        () => {
          if (this.initialized) {
            this.notify(LifeCycles.ON_FORM_INITIAL_VALUES_CHANGE)
          }
        }
      ),
      reaction(
        () => this.loading,
        (loading) => {
          if (loading) {
            this.notify(LifeCycles.ON_FORM_LOADING)
          }
        }
      ),
      reaction(
        () => this.validating,
        (validating) => {
          if (validating) {
            this.notify(LifeCycles.ON_FORM_VALIDATE_START)
            this.notify(LifeCycles.ON_FORM_VALIDATING)
          } else {
            this.notify(LifeCycles.ON_FORM_VALIDATE_END)
          }
        }
      ),
      reaction(
        () => this.submitting,
        (submitting) => {
          if (submitting) {
            this.notify(LifeCycles.ON_FORM_SUBMIT_START)
            this.notify(LifeCycles.ON_FORM_SUBMITTING)
          } else {
            this.notify(LifeCycles.ON_FORM_SUBMIT_END)
          }
        }
      )
    )
  }

  get display() {
    return this._display
  }

  set display(type: FormDisplayTypes) {
    this.setDisplay(type)
  }

  get pattern() {
    return this._pattern
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
    return this._loading
  }

  set loading(loading: boolean) {
    this.setLoading(loading)
  }

  get validating() {
    return this._validating
  }

  set validating(validating: boolean) {
    this.setValidating(validating)
  }

  get submitting() {
    return this._submitting
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

  /** 创建字段 * */

  createField<Component extends JSXComponent, T = any>(
    props: IFieldFactoryProps<Component, T>
  ): Field<Component, T> | undefined {
    const path = FormPath.parse(props.basePath).concat(props.name)
    const identifier = path.toString()
    if (!identifier) return undefined
    if (!this.fields[identifier]) {
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
      merge(this.values, values, {
        // never reach
        arrayMerge: (target, source) => source,
        assign: true,
      })
    } else if (strategy === 'shallowMerge') {
      Object.assign(this.values, values)
    } else {
      this.values = values as any
    }
  }

  setValuesIn(pattern: FormPathPattern, value: any) {
    FormPath.setIn(this.values, pattern, value)
  }

  setInitialValues(initialValues: any, strategy: IFormMergeStrategy = 'merge') {
    if (!isPlainObj(initialValues)) return
    if (strategy === 'merge') {
      merge(this.initialValues, initialValues, {
        // never reach
        arrayMerge: (target, source) => source,
        assign: true,
      })
    } else if (strategy === 'shallowMerge') {
      Object.assign(this.initialValues, initialValues)
    } else {
      this.initialValues = initialValues as any
    }
  }

  setInitialValuesIn(pattern: FormPathPattern, initialValue: any) {
    FormPath.setIn(this.initialValues, pattern, initialValue)
  }

  deleteValuesIn(pattern: FormPathPattern) {
    FormPath.deleteIn(this.values, pattern)
  }

  existValuesIn(pattern: FormPathPattern) {
    return FormPath.existIn(this.values, pattern)
  }

  getValuesIn(pattern: FormPathPattern) {
    return toJS(FormPath.getIn(this.values, pattern))
  }

  deleteInitialValuesIn(pattern: FormPathPattern) {
    FormPath.deleteIn(this.initialValues, pattern)
  }

  existInitialValuesIn(pattern: FormPathPattern) {
    return FormPath.existIn(this.initialValues, pattern)
  }

  getInitialValuesIn(pattern: FormPathPattern) {
    return toJS(FormPath.getIn(this.initialValues, pattern))
  }

  setDisplay(display: FormDisplayTypes) {
    if (!isValid(display)) return
    this._display = display
    const actualDisplay = this.display
    if (actualDisplay === 'none') {
      // 当前节点及子节点value清空
      this.deleteValuesIn('*')
    }
    if (actualDisplay === 'hidden' || actualDisplay === 'none') {
      this.clearErrors()
    }
  }

  setPattern(pattern: FormPatternTypes) {
    if (!isValid(pattern)) return
    this._pattern = pattern
    const actualPattern = this.pattern
    if (actualPattern !== 'editable') {
      this.clearErrors()
    }
  }

  setLoading(loading: boolean) {
    if (!isValid(loading)) return
    this._loading = loading
  }

  setValidating(validating: boolean) {
    if (!isValid(validating)) return
    this._validating = validating
  }

  setSubmitting(submitting: boolean) {
    if (!isValid(submitting)) return
    this._submitting = submitting
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

  notify(type: string, payload?: Field | any) {
    this._lifecycle.emit({ type, payload: payload ?? this })
  }

  /** 事件钩子* */

  onInit() {
    this.initialized = true
    this.notify(LifeCycles.ON_FORM_INIT)
  }

  onMount() {
    this.mounted = true
    this.notify(LifeCycles.ON_FORM_MOUNT)
  }

  onUnmount() {
    this.notify(LifeCycles.ON_FORM_UNMOUNT)
    this.query('*').forEach((field) => field.destroy(false))
    this.disposers.forEach((dispose) => dispose())
    this.unmounted = true
    this.indexes = {}
  }

  async validate(pattern: FormPathPattern = '*') {
    await batchValidate(this, pattern)
  }

  async submit<T>(onSubmit?: (values: ValueType) => Promise<T> | void): Promise<T> {
    return batchSubmit(this, onSubmit)
  }

  async reset(pattern: FormPathPattern = '*', options?: IFieldResetOptions) {
    await batchReset(this, pattern, options)
  }
}
