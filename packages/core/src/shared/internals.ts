/* eslint-disable no-param-reassign */
import { isPlainObj, isValid, isEmpty, isFn } from '@astro-form/shared'
import { Path as FormPath, Pattern as FormPathPattern } from '@formily/path'
import { parseValidatorDescriptions, ValidatorTriggerType, validate, IValidateResults } from '@formily/validator'
import { runInAction, toJS } from 'mobx'

import {
  LifeCycles,
  IFormFeedback,
  ISearchFeedback,
  IFieldFeedback,
  FieldFeedbackTypes,
  FieldFeedbackCodeTypes,
  IFieldResetOptions,
} from '@/types'
import type { ArrayField, Field, Form } from '@/models'
import { BaseField } from '@/models/BaseField'
import { isArrayField, isForm, isObjectField } from '@/shared/checkers'

const notify = (target: Form | BaseField, formType: LifeCycles, fieldType: LifeCycles) => {
  if (isForm(target)) {
    target.notify(formType)
  } else {
    target.notify(fieldType)
  }
}

export const locateNode = (field: Field, path: FormPathPattern) => {
  runInAction(() => {
    field.path = FormPath.parse(path)
    field.form.indexes[field.path.toString()] = field.path.toString()
  })
  return field
}

export const destroy = (target: Record<string, Field>, path: string, forceClear = true) => {
  const field = target[path]
  field?.dispose()
  if (forceClear) {
    const { form } = field
    form.deleteValuesIn(field.path)
    form.deleteInitialValuesIn(field.path)
  }
  delete target[path]
}

const { hasOwnProperty } = Object.prototype
export const setValidatorRule = (field: BaseField, name: string, value: any) => {
  if (!isValid(value)) return
  const validators = field.validator ? parseValidatorDescriptions(field.validator) : []
  const hasRule = validators.some((desc) => name in desc)
  const rule = { [name]: value }
  if (hasRule) {
    field.validator = validators.map((desc) => {
      if (isPlainObj(desc) && hasOwnProperty.call(desc, name)) {
        desc[name] = value
        return desc
      }
      return desc
    })
  } else if (name === 'required') {
    field.validator = [rule].concat(validators)
  } else {
    field.validator = validators.concat(rule)
  }
}

export const createChildrenFeedbackFilter = (field: BaseField) => {
  const identifier = field.path.toString()
  return ({ path }: IFormFeedback) => {
    return path === identifier || path?.indexOf(`${identifier}.`) === 0
  }
}

export const matchFeedback = (search: ISearchFeedback, feedback: IFormFeedback) => {
  if (search.type && search.type !== feedback.type) return false
  if (search.code && search.code !== feedback.code) return false
  if (search.path && feedback.path) {
    if (!FormPath.parse(search.path).match(feedback.path)) return false
  }
  if (search.triggerType && search.triggerType !== feedback.triggerType) return false
  return true
}

export const queryFeedbacks = (field: BaseField, search: ISearchFeedback) => {
  const feedbacks = field.feedbacks.filter((feedback) => {
    if (!feedback.messages.length) return false
    return matchFeedback(search, {
      ...feedback,
      path: field.path?.toString(),
    })
  })
  return toJS(feedbacks)
}

export const queryFeedbackMessages = (field: BaseField, search: ISearchFeedback) => {
  if (!field.feedbacks.length) return []
  return queryFeedbacks(field, search).reduce<string[]>(
    (buf, info) => (isEmpty(info.messages) ? buf : buf.concat(info.messages)),
    []
  )
}

export const updateFeedback = (field: BaseField, feedback: IFieldFeedback) => {
  if (!field.feedbacks.length) {
    if (!feedback.messages.length) {
      return
    }
    field.feedbacks = [feedback]
  } else {
    const searched = queryFeedbacks(field, feedback)
    if (searched.length) {
      field.feedbacks = field.feedbacks.reduce<IFieldFeedback[]>((buf, item) => {
        if (searched.includes(item)) {
          if (feedback.messages.length) {
            item.messages = feedback.messages
            return buf.concat(item)
          }
          return buf
        }
        return buf.concat(item)
      }, [])
    } else if (feedback.messages.length) {
      field.feedbacks = field.feedbacks.concat(feedback)
    }
  }
}

export const isHTMLInputEvent = (event: any, stopPropagation = true) => {
  if (event?.target) {
    if (typeof event.target === 'object' && ('value' in event.target || 'checked' in event.target)) return true
    if (stopPropagation) event.stopPropagation?.()
  }
  return false
}

export const batchSubmit = async <T>(
  target: Form | Field,
  onSubmit?: (values: any) => Promise<T> | void
): Promise<T> => {
  const getValues = (_target: Form | Field) => {
    if (isForm(_target)) {
      return toJS(_target.values)
    }
    return toJS(_target.value)
  }
  target.setSubmitting(true)
  try {
    notify(target, LifeCycles.ON_FORM_SUBMIT_VALIDATE_START, LifeCycles.ON_FIELD_SUBMIT_VALIDATE_START)
    await target.validate()
    notify(target, LifeCycles.ON_FORM_SUBMIT_VALIDATE_SUCCESS, LifeCycles.ON_FIELD_SUBMIT_VALIDATE_SUCCESS)
  } catch (e) {
    notify(target, LifeCycles.ON_FORM_SUBMIT_VALIDATE_FAILED, LifeCycles.ON_FIELD_SUBMIT_VALIDATE_FAILED)
  }
  notify(target, LifeCycles.ON_FORM_SUBMIT_VALIDATE_END, LifeCycles.ON_FIELD_SUBMIT_VALIDATE_END)
  let results: any
  try {
    if (target.invalid) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw target.errors
    }
    if (isFn(onSubmit)) {
      results = await onSubmit(getValues(target))
    } else {
      results = getValues(target)
    }
    notify(target, LifeCycles.ON_FORM_SUBMIT_SUCCESS, LifeCycles.ON_FIELD_SUBMIT_SUCCESS)
  } catch (e) {
    target.setSubmitting(false)
    notify(target, LifeCycles.ON_FORM_SUBMIT_FAILED, LifeCycles.ON_FIELD_SUBMIT_FAILED)
    notify(target, LifeCycles.ON_FORM_SUBMIT, LifeCycles.ON_FIELD_SUBMIT)
    throw e
  }
  target.setSubmitting(false)
  notify(target, LifeCycles.ON_FORM_SUBMIT, LifeCycles.ON_FIELD_SUBMIT)
  return results
}

export const validateToFeedbacks = async (field: Field, triggerType?: ValidatorTriggerType) => {
  function capitalize(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  const results = await validate(field.value, field.validator!, {
    triggerType,
    validateFirst: field.validateFirst ?? field.form.validateFirst,
    context: { field, form: field.form },
  })
  runInAction(() => {
    ;(Object.entries(results) as [FieldFeedbackTypes, string[]][]).forEach(([type, messages]) => {
      field.setFeedback({
        triggerType,
        type,
        code: `validate${capitalize(type)}` as FieldFeedbackCodeTypes,
        messages,
      })
    })
  })
  return results
}

export const validateSelf = async (target: Field, triggerType?: ValidatorTriggerType, noEmit = false) => {
  const end = () => {
    target.setValidating(false)
    if (noEmit) return
    if (target.selfValid) {
      target.notify(LifeCycles.ON_FIELD_VALIDATE_SUCCESS)
    } else {
      target.notify(LifeCycles.ON_FIELD_VALIDATE_FAILED)
    }
  }

  if (target.pattern !== 'editable' || target.display !== 'visible' || !target.validator) return {}
  target.setValidating(true)
  const results = await validateToFeedbacks(target, triggerType)
  end()
  return results
}

export const batchValidate = async (
  target: Form | Field,
  pattern: FormPathPattern,
  triggerType?: ValidatorTriggerType
): Promise<void> => {
  if (isForm(target)) {
    target.setValidating(true)
  } else if (target.pattern !== 'editable' || target.display !== 'visible') {
    return
  }
  const tasks: Array<Promise<IValidateResults>> = []
  target.query(pattern).forEach((field) => {
    tasks.push(validateSelf(field, triggerType, field === target))
  })
  await Promise.all(tasks)
  if (isForm(target)) {
    target.setValidating(false)
  }
  if (target.invalid) {
    notify(target, LifeCycles.ON_FORM_VALIDATE_FAILED, LifeCycles.ON_FIELD_VALIDATE_FAILED)
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw target.errors
  }
  notify(target, LifeCycles.ON_FORM_VALIDATE_SUCCESS, LifeCycles.ON_FIELD_VALIDATE_SUCCESS)
}

export const resetSelf = (target: Field, options?: IFieldResetOptions, noEmit = false) => {
  const getTypedDefaultValue = (field: Field) => {
    if (isArrayField(field)) return []
    if (isObjectField(field)) return {}
    return undefined
  }
  const typedDefaultValue = getTypedDefaultValue(target)
  target.modified = false
  target.selfModified = false
  target.visited = false
  target.feedbacks = []
  target.inputValue = typedDefaultValue
  if (target.value !== undefined) {
    if (options?.forceClear) {
      target.value = typedDefaultValue
    } else {
      const { initialValue } = target
      target.value = toJS(initialValue !== undefined ? initialValue : typedDefaultValue)
    }
  }
  if (!noEmit) {
    target.notify(LifeCycles.ON_FIELD_RESET)
  }
  if (options?.validate) {
    return validateSelf(target)
  }
  return Promise.resolve(null)
}

export const batchReset = async (target: Form | Field, pattern: FormPathPattern, options?: IFieldResetOptions) => {
  const tasks: Array<Promise<any>> = []
  target.query(pattern).forEach((field) => {
    tasks.push(resetSelf(field, options, target === field))
  })
  if (isForm(target)) {
    target.modified = false
  }
  notify(target, LifeCycles.ON_FORM_RESET, LifeCycles.ON_FIELD_RESET)
  await Promise.all(tasks)
}

export const modifySelf = (target: Field) => {
  if (target.selfModified) return
  target.selfModified = true
  target.modified = true
  let { parent } = target
  while (parent) {
    if (parent.modified) return
    parent.modified = true
    parent = parent.parent
  }
  target.form.modified = true
}

export const getValuesFromEvent = (args: any[]) => {
  return args.map((event) => {
    if (event?.target) {
      if (isValid(event.target.value)) return event.target.value
      if (isValid(event.target.checked)) return event.target.checked
      return undefined
    }
    return event
  })
}

export interface INodePatch<T> {
  type: 'remove' | 'update'
  path: string
  oldPath?: string
  payload?: T
}

export const patchFieldStates = (target: Record<string, Field>, patches: INodePatch<Field>[]) => {
  patches.forEach(({ type, path, oldPath, payload }) => {
    if (type === 'remove') {
      destroy(target, path, false)
    } else if (type === 'update') {
      if (payload) {
        target[path] = payload
        if (oldPath && target[oldPath] === payload) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          target[oldPath] = undefined
        }
      }
      if (path && payload) {
        locateNode(payload, path)
      }
    }
  })
}

const NumberIndexReg = /^\.(\d+)/
export const spliceArrayState = (
  field: ArrayField,
  props?: {
    startIndex?: number
    deleteCount?: number
    insertCount?: number
  }
) => {
  const { startIndex, deleteCount, insertCount } = {
    startIndex: 0,
    deleteCount: 0,
    insertCount: 0,
    ...props,
  }
  const path = field.path.toString()
  const addrLength = path.length
  const { form } = field
  const { fields } = form
  const fieldPatches: INodePatch<Field>[] = []
  const offset = insertCount - deleteCount
  const isArrayChildren = (identifier: string) => {
    return identifier.indexOf(path) === 0 && identifier.length > addrLength
  }
  const isAfterNode = (identifier: string) => {
    const afterStr = identifier.substring(addrLength)
    const number = afterStr.match(NumberIndexReg)?.[1]
    if (number === undefined) return false
    const index = Number(number)
    return index > startIndex + deleteCount - 1
  }
  const isInsertNode = (identifier: string) => {
    const afterStr = identifier.substring(addrLength)
    const number = afterStr.match(NumberIndexReg)?.[1]
    if (number === undefined) return false
    const index = Number(number)
    return index >= startIndex && index < startIndex + insertCount
  }
  const isDeleteNode = (identifier: string) => {
    const preStr = identifier.substring(0, addrLength)
    const afterStr = identifier.substring(addrLength)
    const number = afterStr.match(NumberIndexReg)?.[1]
    if (number === undefined) return false
    const index = Number(number)
    return (
      (index > startIndex && !fields[`${preStr}${afterStr.replace(/^\.\d+/, `.${index + deleteCount}`)}`]) ||
      index === startIndex
    )
  }
  const moveIndex = (identifier: string) => {
    if (offset === 0) return identifier
    const preStr = identifier.substring(0, addrLength)
    const afterStr = identifier.substring(addrLength)
    const number = afterStr.match(NumberIndexReg)?.[1]
    if (number === undefined) return identifier
    const index = Number(number) + offset
    return `${preStr}${afterStr.replace(/^\.\d+/, `.${index}`)}`
  }

  Object.entries(fields).forEach(([identifier, _field]) => {
    if (isArrayChildren(identifier)) {
      if (isAfterNode(identifier)) {
        const newIdentifier = moveIndex(identifier)
        fieldPatches.push({
          type: 'update',
          path: newIdentifier,
          oldPath: identifier,
          payload: _field,
        })
      }
      if (isInsertNode(identifier) || isDeleteNode(identifier)) {
        fieldPatches.push({ type: 'remove', path: identifier })
      }
    }
  })
  patchFieldStates(fields, fieldPatches)
  field.form.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)
}

export const exchangeArrayState = (
  field: ArrayField,
  props: {
    fromIndex?: number
    toIndex?: number
  }
) => {
  const { fromIndex, toIndex } = {
    fromIndex: 0,
    toIndex: 0,
    ...props,
  }
  const path = field.path.toString()
  const { fields } = field.form
  const addrLength = path.length
  const fieldPatches: INodePatch<Field>[] = []
  const isArrayChildren = (identifier: string) => {
    return identifier.indexOf(path) === 0 && identifier.length > addrLength
  }

  const isDown = fromIndex < toIndex

  const isMoveNode = (identifier: string) => {
    const afterStr = identifier.slice(path.length)
    const number = afterStr.match(NumberIndexReg)?.[1]
    if (number === undefined) return false
    const index = Number(number)
    return isDown ? index > fromIndex && index <= toIndex : index < fromIndex && index >= toIndex
  }

  const isFromNode = (identifier: string) => {
    const afterStr = identifier.substring(addrLength)
    const number = afterStr.match(NumberIndexReg)?.[1]
    if (number === undefined) return false
    const index = Number(number)
    return index === fromIndex
  }

  const moveIndex = (identifier: string) => {
    const preStr = identifier.substring(0, addrLength)
    const afterStr = identifier.substring(addrLength)
    const number = afterStr.match(NumberIndexReg)?.[1]
    const current = Number(number)
    let index = current
    if (index === fromIndex) {
      index = toIndex
    } else {
      index += isDown ? -1 : 1
    }

    return `${preStr}${afterStr.replace(/^\.\d+/, `.${index}`)}`
  }
  Object.entries(fields).forEach(([identifier, _field]) => {
    if (isArrayChildren(identifier)) {
      if (isMoveNode(identifier) || isFromNode(identifier)) {
        const newIdentifier = moveIndex(identifier)
        fieldPatches.push({
          type: 'update',
          path: newIdentifier,
          oldPath: identifier,
          payload: _field,
        })
        if (!fields[newIdentifier]) {
          fieldPatches.push({ type: 'remove', path: identifier })
        }
      }
    }
  })
  patchFieldStates(fields, fieldPatches)
  field.form.notify(LifeCycles.ON_FORM_GRAPH_CHANGE)
}

/** 清空本 field 以及所有子 field 的 error */
export const clearAllSubErrors = (field: BaseField) => {
  field.query('*').forEach((_field) => {
    _field.setFeedback({
      type: 'error',
      messages: [],
    })
  })
}
