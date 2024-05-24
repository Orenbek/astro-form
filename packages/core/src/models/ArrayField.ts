import { isArr } from '@astro-form/shared'
import { makeObservable, action } from 'mobx'

import { move } from '@/utils'

import { spliceArrayState, exchangeArrayState, INodePatch } from '../shared/internals'
import { JSXComponent, IFieldProps, FormPathPattern, LifeCycles } from '../types'

import { Field } from './Field'
import type { Form } from './Form'

export class ArrayField<Component extends JSXComponent = any, ValueType extends any[] = any[]> extends Field<
  Component,
  ValueType
> {
  displayName = 'ArrayField'

  constructor(path: FormPathPattern, props: IFieldProps<Component>, form: Form) {
    const v = form.getValuesIn(path)
    const initialV = form.getInitialValuesIn(path)
    const value = (() => {
      if (isArr(props.value)) return props.value
      if (isArr(v)) return v
      if (isArr(props.initialValue)) return props.initialValue
      if (isArr(initialV)) return initialV
      return []
    })()
    const initialValue = (() => {
      if (isArr(props.initialValue)) return props.initialValue
      if (isArr(initialV)) return initialV
      return []
    })()
    super(
      path,
      {
        ...props,
        value: value as any,
        initialValue: initialValue as any,
      },
      form
    )
    this.#makeObservable()
  }

  #makeObservable() {
    makeObservable<ArrayField, 'patchFieldStates'>(this, {
      push: action,
      pop: action,
      insert: action,
      remove: action,
      shift: action,
      unshift: action,
      move: action,
      patchFieldStates: action,
    })
  }

  get indexes(): number[] {
    return this.path.transform(/^\d+$/, (...args) => args.map((index) => Number(index))) as number[]
  }

  private patchFieldStates(patches: INodePatch<Field>[]) {
    const { fields } = this.form
    patches.forEach(({ type, path, oldPath, payload }) => {
      if (type === 'remove') {
        fields[path]?.destroy(false)
      } else if (type === 'update') {
        payload!.__updateFieldPath(path)
        if (oldPath && fields[oldPath] === payload) {
          delete fields[oldPath]
        }
      }
    })
  }

  //  insert 如果需要移动 field 则移动，并新增 value 不新建子 field
  // move 移动 field
  // delete 删除 field 但保留初始值

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
    const fieldPatches = spliceArrayState(this, {
      startIndex: index,
      deleteCount: 1,
    })
    this.patchFieldStates(fieldPatches)
    this.form.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)
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
    const fieldPatches = spliceArrayState(this, {
      startIndex: index,
      insertCount: items.length,
    })
    this.patchFieldStates(fieldPatches)
    this.form.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)

    this.value.splice(index, 0, ...items)
    await this.onInput(this.value)
  }

  async remove(index: number) {
    if (!isArr(this.value)) return
    const fieldPatches = spliceArrayState(this, {
      startIndex: index,
      deleteCount: 1,
    })
    this.patchFieldStates(fieldPatches)
    this.form.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)

    this.value.splice(index, 1)
    await this.onInput(this.value)
  }

  async shift() {
    if (!isArr(this.value)) return
    const fieldPatches = spliceArrayState(this, {
      startIndex: 0,
      deleteCount: 1,
    })
    this.patchFieldStates(fieldPatches)
    this.form.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)
    this.value.shift()
    await this.onInput(this.value)
  }

  async unshift(...items: any[]) {
    if (!isArr(this.value)) {
      this.value = [] as unknown as ValueType
    }
    const fieldPatches = spliceArrayState(this, {
      startIndex: 0,
      insertCount: items.length,
    })
    this.patchFieldStates(fieldPatches)
    this.form.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)

    this.value.unshift(...items)
    await this.onInput(this.value)
  }

  async move(fromIndex: number, toIndex: number) {
    if (!isArr(this.value)) return
    if (fromIndex === toIndex) return
    move(this.value, fromIndex, toIndex)
    const fieldPatches = exchangeArrayState(this, {
      fromIndex,
      toIndex,
    })
    this.patchFieldStates(fieldPatches)
    this.form.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)

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
