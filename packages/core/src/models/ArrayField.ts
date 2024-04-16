import { isArr } from '@astro-form/shared'
import { makeObservable, override, action } from 'mobx'

import { move } from '@/utils'

import { spliceArrayState, exchangeArrayState, cleanupArrayChildren } from '../shared/internals'
import { JSXComponent, IFieldProps, FormPathPattern } from '../types'

import { Field } from './Field'
import type { Form } from './Form'

export class ArrayField<Component extends JSXComponent = any, ValueType extends any[] = any[]> extends Field<
  Component,
  ValueType
> {
  displayName = 'ArrayField'

  constructor(path: FormPathPattern, props: IFieldProps<Component>, form: Form) {
    super(path, props, form)
    this.locate(path, this)
    this.makeObservable()
  }

  protected makeObservable() {
    makeObservable(this, {
      setValue: override,
      push: action,
      pop: action,
      insert: action,
      remove: action,
      shift: action,
      unshift: action,
      move: action,
    })
  }

  setValue(value: ValueType) {
    if (this.destroyed) return
    if (this.display === 'none') {
      return
    }
    const oldLength = this.value.length
    this.form.setValuesIn(this.path, value)
    const newLength = this.value.length

    if (newLength !== oldLength) {
      if (oldLength && !newLength) {
        cleanupArrayChildren(this, 0)
      } else if (newLength < oldLength) {
        cleanupArrayChildren(this, newLength)
      }
    }
  }

  async push(...items: any[]) {
    if (!isArr(this.value)) {
      this.value = [] as unknown as ValueType
    }
    this.value.push(...items)
    await this.onInput(this.value)
  }

  async pop() {
    if (!isArr(this.value)) return
    const index = this.value.length - 1
    spliceArrayState(this, {
      startIndex: index,
      deleteCount: 1,
    })
    this.value.pop()
    await this.onInput(this.value)
  }

  async insert(index: number, ...items: any[]) {
    if (!isArr(this.value)) {
      this.value = [] as unknown as ValueType
    }
    if (items.length === 0) {
      return
    }
    spliceArrayState(this, {
      startIndex: index,
      insertCount: items.length,
    })
    this.value.splice(index, 0, ...items)
    await this.onInput(this.value)
  }

  async remove(index: number) {
    if (!isArr(this.value)) return
    spliceArrayState(this, {
      startIndex: index,
      deleteCount: 1,
    })
    this.value.splice(index, 1)
    await this.onInput(this.value)
  }

  async shift() {
    if (!isArr(this.value)) return
    this.value.shift()
    await this.onInput(this.value)
  }

  async unshift(...items: any[]) {
    if (!isArr(this.value)) {
      this.value = [] as unknown as ValueType
    }
    spliceArrayState(this, {
      startIndex: 0,
      insertCount: items.length,
    })
    this.value.unshift(...items)
    await this.onInput(this.value)
  }

  async move(fromIndex: number, toIndex: number) {
    if (!isArr(this.value)) return
    if (fromIndex === toIndex) return
    move(this.value, fromIndex, toIndex)
    exchangeArrayState(this, {
      fromIndex,
      toIndex,
    })
    await this.onInput(this.value)
  }

  async moveUp(index: number) {
    if (!isArr(this.value)) return
    await this.move(index, index - 1 < 0 ? this.value.length - 1 : index - 1)
  }

  async moveDown(index: number) {
    if (!isArr(this.value)) return
    await this.move(index, index + 1 >= this.value.length ? 0 : index + 1)
  }
}
