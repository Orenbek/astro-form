import { action, makeObservable, override } from 'mobx'

import { cleanupObjectChildren } from '../shared/internals'
import { JSXComponent, IFieldProps, FormPathPattern } from '../types'

import { Field } from './Field'
import type { Form } from './Form'

export class ObjectField<Component extends JSXComponent = any, ValueType extends object = object> extends Field<
  Component,
  ValueType
> {
  displayName = 'ObjectField'

  private additionalProperties: string[] = []

  constructor(path: FormPathPattern, props: IFieldProps<Component>, form: Form) {
    super(path, props, form)
    this.locate(path, this)
    this.makeObservable()
  }

  protected makeObservable() {
    makeObservable(this, {
      setValue: override,
      addProperty: action,
      removeProperty: action,
    })
  }

  setValue(value: ValueType) {
    if (this.destroyed) return
    if (this.display === 'none') {
      return
    }
    const oldKeys = Object.keys(this.value || {})
    this.form.setValuesIn(this.path, value)
    const newKeys = Object.keys(this.value || {})
    // keys changed
    if (oldKeys.length !== newKeys.length || oldKeys.some((it) => !newKeys.includes(it))) {
      const filterKeys = this.additionalProperties.filter((key) => !newKeys.includes(key))
      cleanupObjectChildren(this, filterKeys)
    }
  }

  addProperty(key: string, value: any): unknown {
    this.form.setValuesIn(this.path.concat(key), value)
    this.additionalProperties.push(key)
    return this.onInput(this.value)
  }

  removeProperty(key: string) {
    this.form.deleteValuesIn(this.path.concat(key))
    this.additionalProperties.splice(this.additionalProperties.indexOf(key), 1)
    return this.onInput(this.value)
  }

  existProperty(key: string) {
    return this.form.existValuesIn(this.path.concat(key))
  }
}
