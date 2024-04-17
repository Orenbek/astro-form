/* eslint-disable no-new */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Path as FormPath, Pattern as FormPathPattern } from '@formily/path'
import { merge } from '@formily/shared/esm/merge'
import { isValid, isObj, isArr, isPlainObj } from '@astro-form/shared'
import structuredClone from '@ungap/structured-clone'
import { reaction, makeObservable, observable, computed, action } from 'mobx'

import {
  JSXComponent,
  LifeCycleTypes,
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
import { batchValidate, batchReset, batchSubmit, setValidating, setSubmitting, setLoading } from '../shared/internals'

import { Field } from './Field'
import { ArrayField } from './ArrayField'
import { ObjectField } from './ObjectField'
import { LifeCycle } from './LifeCycle'
import { Query } from './Query'

type IFieldUpdate = {
  pattern: FormPath
  callbacks: ((...args: any[]) => any)[]
}

interface IFormRequests {
  validate?: number
  submit?: number
  loading?: number
  updates?: IFieldUpdate[]
  updateIndexes?: Record<string, number>
}

type IFormMergeStrategy = 'overwrite' | 'merge' | 'shallowMerge'

export class Form<ValueType extends object = any> {
  displayName = 'Form'

  protected _pattern: FormPatternTypes = 'editable'

  protected _display: FormDisplayTypes = 'visible'

  initialized: boolean = false

  mounted: boolean = false

  unmounted: boolean = false

  loading: boolean = false

  validating: boolean = false

  submitting: boolean = false

  modified: boolean = false

  values!: ValueType

  initialValues!: Partial<ValueType>

  lifecycle = new LifeCycle()

  fields: IFormFields = {}

  requests: IFormRequests = {}

  indexes: Record<string, string> = {}

  disposers: (() => void)[] = []

  constructor(props: IFormProps<ValueType>) {
    this.initialize(props)
    this.makeObservable()
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
    this.values = structuredClone(props.values || {})
    this.initialValues = structuredClone(props.initialValues || {})
  }

  protected makeObservable() {
    makeObservable<Form, '_display' | '_pattern'>(this, {
      _display: observable.ref,
      _pattern: observable.ref,
      initialized: observable.ref,
      mounted: observable.ref,
      unmounted: observable.ref,
      loading: observable.ref,
      validating: observable.ref,
      submitting: observable.ref,
      modified: observable.ref,
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
            this.notify(LifeCycleTypes.ON_FORM_VALUES_CHANGE)
          }
        }
      ),
      reaction(
        () => this.initialValues,
        () => {
          if (this.initialized) {
            this.notify(LifeCycleTypes.ON_FORM_INITIAL_VALUES_CHANGE)
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
      this.notify(LifeCycleTypes.ON_FORM_GRAPH_CHANGE)
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
      new ArrayField(
        path,
        {
          ...props,
          value: isArr(props.value) ? props.value : [],
        },
        this
      )
      this.notify(LifeCycleTypes.ON_FORM_GRAPH_CHANGE)
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
      new ObjectField(
        path,
        {
          ...props,
          value: isObj(props.value) ? props.value : {},
        },
        this
      )
      this.notify(LifeCycleTypes.ON_FORM_GRAPH_CHANGE)
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
    return FormPath.getIn(this.values, pattern)
  }

  deleteInitialValuesIn(pattern: FormPathPattern) {
    FormPath.deleteIn(this.initialValues, pattern)
  }

  existInitialValuesIn(pattern: FormPathPattern) {
    return FormPath.existIn(this.initialValues, pattern)
  }

  getInitialValuesIn(pattern: FormPathPattern) {
    return FormPath.getIn(this.initialValues, pattern)
  }

  setDisplay(display: FormDisplayTypes) {
    if (!isValid(display)) return
    this._display = display
  }

  setPattern(pattern: FormPatternTypes) {
    if (!isValid(pattern)) return
    this._pattern = pattern
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
    this.lifecycle.addEffects(id, () => effects(this))
  }

  removeEffects(id: string) {
    this.lifecycle.removeEffects(id)
  }

  on(
    ...args:
      | [FormLifeCycleUnion, (form: Form) => void]
      | [FieldLifeCycleUnion, FormPathPattern, (field: Field, form: Form) => void]
  ) {
    const [lifecycle] = args
    switch (lifecycle) {
      case LifeCycleTypes.ON_FORM_INIT:
      case LifeCycleTypes.ON_FORM_MOUNT:
      case LifeCycleTypes.ON_FORM_UNMOUNT:
      case LifeCycleTypes.ON_FORM_INPUT_CHANGE:
      case LifeCycleTypes.ON_FORM_VALUES_CHANGE:
      case LifeCycleTypes.ON_FORM_INITIAL_VALUES_CHANGE:
      case LifeCycleTypes.ON_FORM_SUBMIT:
      case LifeCycleTypes.ON_FORM_RESET:
      case LifeCycleTypes.ON_FORM_SUBMIT_START:
      case LifeCycleTypes.ON_FORM_SUBMITTING:
      case LifeCycleTypes.ON_FORM_SUBMIT_END:
      case LifeCycleTypes.ON_FORM_SUBMIT_VALIDATE_START:
      case LifeCycleTypes.ON_FORM_SUBMIT_VALIDATE_SUCCESS:
      case LifeCycleTypes.ON_FORM_SUBMIT_VALIDATE_FAILED:
      case LifeCycleTypes.ON_FORM_SUBMIT_VALIDATE_END:
      case LifeCycleTypes.ON_FORM_SUBMIT_SUCCESS:
      case LifeCycleTypes.ON_FORM_SUBMIT_FAILED:
      case LifeCycleTypes.ON_FORM_VALIDATE_START:
      case LifeCycleTypes.ON_FORM_VALIDATING:
      case LifeCycleTypes.ON_FORM_VALIDATE_SUCCESS:
      case LifeCycleTypes.ON_FORM_VALIDATE_FAILED:
      case LifeCycleTypes.ON_FORM_VALIDATE_END:
      case LifeCycleTypes.ON_FORM_GRAPH_CHANGE:
      case LifeCycleTypes.ON_FORM_LOADING:
        this.lifecycle.registerLifeCycleSubscriber({
          type: lifecycle,
          cb: () => args[1](this),
        })
        break
      case LifeCycleTypes.ON_FIELD_INIT:
      case LifeCycleTypes.ON_FIELD_INPUT_VALUE_CHANGE:
      case LifeCycleTypes.ON_FIELD_VALUE_CHANGE:
      case LifeCycleTypes.ON_FIELD_INITIAL_VALUE_CHANGE:
      case LifeCycleTypes.ON_FIELD_SUBMIT:
      case LifeCycleTypes.ON_FIELD_SUBMIT_START:
      case LifeCycleTypes.ON_FIELD_SUBMITTING:
      case LifeCycleTypes.ON_FIELD_SUBMIT_END:
      case LifeCycleTypes.ON_FIELD_SUBMIT_VALIDATE_START:
      case LifeCycleTypes.ON_FIELD_SUBMIT_VALIDATE_SUCCESS:
      case LifeCycleTypes.ON_FIELD_SUBMIT_VALIDATE_FAILED:
      case LifeCycleTypes.ON_FIELD_SUBMIT_VALIDATE_END:
      case LifeCycleTypes.ON_FIELD_SUBMIT_SUCCESS:
      case LifeCycleTypes.ON_FIELD_SUBMIT_FAILED:
      case LifeCycleTypes.ON_FIELD_VALIDATE_START:
      case LifeCycleTypes.ON_FIELD_VALIDATING:
      case LifeCycleTypes.ON_FIELD_VALIDATE_SUCCESS:
      case LifeCycleTypes.ON_FIELD_VALIDATE_FAILED:
      case LifeCycleTypes.ON_FIELD_VALIDATE_END:
      case LifeCycleTypes.ON_FIELD_LOADING:
      case LifeCycleTypes.ON_FIELD_RESET:
      case LifeCycleTypes.ON_FIELD_MOUNT:
      case LifeCycleTypes.ON_FIELD_UNMOUNT:
        this.lifecycle.registerLifeCycleSubscriber({
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
    this.lifecycle.emit({ type, payload: payload ?? this })
  }

  /** 事件钩子* */

  onInit() {
    this.initialized = true
    this.notify(LifeCycleTypes.ON_FORM_INIT)
  }

  onMount() {
    this.mounted = true
    this.notify(LifeCycleTypes.ON_FORM_MOUNT)
  }

  onUnmount() {
    this.notify(LifeCycleTypes.ON_FORM_UNMOUNT)
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
