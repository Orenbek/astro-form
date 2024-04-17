import { Path as FormPath, Pattern as FormPathPattern } from '@formily/path'
import { isFn } from '@astro-form/shared'

import { GeneralField } from '../types'

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

const takeMatchPattern = (form: Form, pattern: FormPath) => {
  const identifier = pattern.toString()
  const indexIdentifier = form.indexes[identifier]
  const absoluteField = form.fields[identifier]
  const indexField = form.fields[indexIdentifier]
  if (absoluteField) {
    return identifier
  }
  if (indexField) {
    return indexIdentifier
  }
  return undefined
}

export class Query {
  private pattern: FormPath

  private paths: string[] = []

  private form: Form

  constructor(props: IQueryProps) {
    this.pattern = FormPath.parse(props.pattern, props.base)
    this.form = props.form
    if (!this.pattern.isMatchPattern) {
      const matched = takeMatchPattern(this.form, this.pattern)
      if (matched) {
        this.paths = [matched]
      }
    } else {
      Object.entries(this.form.fields).forEach(([path, field]) => {
        if (!field) {
          delete this.form.fields[path]
          return
        }
        if (field.match(this.pattern)) {
          this.paths.push(path)
        }
      })
    }
  }

  take(): GeneralField | undefined
  take<Result>(getter: (field: GeneralField, path: FormPath) => Result): Result
  take(taker?: any): any {
    return output(this.form.fields[this.paths[0]], taker)
  }

  map(): GeneralField[]
  map<Result>(iterator?: (field: GeneralField, path: FormPath) => Result): Result[]
  map(iterator?: any): any {
    return this.paths.map((path) => output(this.form.fields[path], iterator))
  }

  forEach<Result>(iterator: (field: GeneralField, path: FormPath) => Result) {
    this.paths.forEach((path) => output(this.form.fields[path], iterator))
  }

  reduce<Result>(reducer: (value: Result, field: GeneralField, path: FormPath) => Result, initial?: Result): Result {
    return this.paths.reduce(
      (value, path) => output(this.form.fields[path], (field, _path) => reducer(value!, field, _path)),
      initial
    ) as any
  }

  getIn(pattern: FormPathPattern) {
    return FormPath.getIn(this.take(), pattern)
  }
}
