import { isFn } from '@astro-form/shared'

import { GeneralField, FormPath, FormPathPattern } from '../types'

import type { Form } from './Form'
import type { Field } from '.'

export interface IQueryProps {
  pattern: FormPathPattern
  base: FormPathPattern
  form: Form
}

const output = (field: Field, taker: (field: Field, path: FormPath) => any) => {
  if (!field) return undefined
  if (isFn(taker)) {
    return taker(field, field.path)
  }
  return field
}

export class Query {
  #pattern: FormPath

  #paths: string[] = []

  #form: Form

  constructor(props: IQueryProps) {
    this.#pattern = FormPath.parse(props.pattern, props.base)
    this.#form = props.form
    if (!this.#pattern.isMatchPattern) {
      const identifier = this.#pattern.toString()
      const matched = this.#form.fields[identifier]
      if (matched) {
        this.#paths = [identifier]
      }
    } else {
      Object.entries(this.#form.fields).forEach(([path, field]) => {
        if (field.match(this.#pattern)) {
          this.#paths.push(path)
        }
      })
    }
  }

  take(): GeneralField | undefined
  take<Result>(getter: (field: GeneralField, path: FormPath) => Result): Result
  take(taker?: any): any {
    return output(this.#form.fields[this.#paths[0]], taker)
  }

  map(): GeneralField[]
  map<Result>(iterator?: (field: GeneralField, path: FormPath) => Result): Result[]
  map(iterator?: any): any {
    return this.#paths.map((path) => output(this.#form.fields[path], iterator))
  }

  forEach<Result>(iterator: (field: GeneralField, path: FormPath) => Result) {
    this.#paths.forEach((path) => output(this.#form.fields[path], iterator))
  }

  reduce<Result>(reducer: (value: Result, field: GeneralField, path: FormPath) => Result, initial?: Result): Result {
    return this.#paths.reduce(
      (value, path) => output(this.#form.fields[path], (field, _path) => reducer(value!, field, _path)),
      initial
    ) as any
  }

  getIn(pattern: FormPathPattern) {
    return FormPath.getIn(this.take(), pattern)
  }
}
