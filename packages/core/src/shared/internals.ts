/* eslint-disable no-param-reassign */
import { isPlainObj, isValid } from '@/utils'
import { parseValidatorDescriptions, ValidatorTriggerType, validate, IValidateResults } from '@formily/validator'
import { toJS } from 'mobx'

import {
  LifeCycles,
  IFormFeedback,
  ISearchFeedback,
  IFieldFeedback,
  FieldFeedbackTypes,
  FieldFeedbackCodeTypes,
  FormPathPattern,
  FormPath,
} from '@/types'
import type { ArrayField, Field, Form } from '@/models'
import { BaseField } from '@/models/BaseField'
import { isForm } from '@/shared/checkers'

const notify = (target: Form | BaseField, formType: LifeCycles, fieldType: LifeCycles) => {
  if (isForm(target)) {
    target.notify(formType)
  } else {
    target.notify(fieldType)
  }
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

export const queryFeedbacks = (field: BaseField, search: ISearchFeedback) => {
  const feedbacks = field.feedbacks.filter((feedback) => {
    if (search.type && search.type !== feedback.type) return false
    if (search.code && search.code !== feedback.code) return false
    if (search.path) {
      if (!FormPath.parse(search.path).match(field.path.toString())) return false
    }
    if (search.triggerType && search.triggerType !== feedback.triggerType) return false
    return true
  })
  return toJS(feedbacks)
}

export const updateFeedback = (field: BaseField, feedback: IFieldFeedback): Array<IFieldFeedback> => {
  if (!field.feedbacks.length) {
    return [feedback]
  }
  const searched = queryFeedbacks(field, feedback)
  if (searched.length) {
    return field.feedbacks.reduce<IFieldFeedback[]>((buf, item) => {
      if (searched.includes(item)) {
        item.messages = feedback.messages
        return buf.concat(item)
      }
      return buf.concat(item)
    }, [])
  }
  return field.feedbacks.concat(feedback)
}

export const isHTMLInputEvent = (event: any, stopPropagation = true) => {
  if (event?.target) {
    if (typeof event.target === 'object' && ('value' in event.target || 'checked' in event.target)) return true
    if (stopPropagation) event.stopPropagation?.()
  }
  return false
}

export const validateSelf = async (target: Field, triggerType?: ValidatorTriggerType, noEmit = false) => {
  function capitalize(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  if (target.pattern !== 'editable' || target.display !== 'visible' || !target.validator) return {}
  target.setValidating(true)
  let results: any = {}
  if (!triggerType) {
    const allTriggerTypes = parseValidatorDescriptions(target.validator).reduce(
      (types, desc) => (types.indexOf(desc.triggerType) > -1 ? types : types.concat(desc.triggerType)),
      []
    )
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < allTriggerTypes.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const payload = await validate(target.value, target.validator!, {
        triggerType: allTriggerTypes[i] || 'onInput',
        validateFirst: target.validateFirst ?? target.form.validateFirst,
        context: { field: target, form: target.form },
      })
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      Object.keys(payload).forEach((key) => {
        results[key] = results[key] || []
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        results[key] = results[key].concat(payload[key])
      })
    }
  } else {
    results = await validate(target.value, target.validator!, {
      triggerType: triggerType || 'onInput',
      validateFirst: target.validateFirst ?? target.form.validateFirst,
      context: { field: target, form: target.form },
    })
  }
  ;(Object.entries(results) as [FieldFeedbackTypes, string[]][]).forEach(([type, messages]) => {
    target.setFeedback({
      triggerType: triggerType || 'onInput',
      type,
      code: `Validate${capitalize(type)}` as FieldFeedbackCodeTypes,
      messages,
    })
  })

  target.setValidating(false)
  if (!noEmit) {
    if (target.selfValid) {
      target.notify(LifeCycles.ON_FIELD_VALIDATE_SUCCESS)
    } else {
      target.notify(LifeCycles.ON_FIELD_VALIDATE_FAILED)
    }
  }
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

/**
 * Extract field value(s) from onInput/onChange args.
 *
 * HTML checkbox always has a string `value` (default `"on"`), while the semantic
 * state lives in `checked` (boolean). Prefer `checked` when `type === 'checkbox'`
 * so boolean fields toggle true/false instead of stuck at `"on"`.
 */
export const getValuesFromEvent = (args: any[]) => {
  return args.map((event) => {
    if (event?.target) {
      const { type, value, checked } = event.target
      // checkbox: boolean checked state is the form value
      if (type === 'checkbox') {
        return isValid(checked) ? checked : undefined
      }
      if (isValid(value)) return value
      if (isValid(checked)) return checked
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

const NumberIndexReg = /^\.(\d+)/
export const spliceArrayState = (
  field: ArrayField,
  props?: {
    startIndex?: number
    deleteCount?: number
    insertCount?: number
  }
): INodePatch<Field<any, any>>[] => {
  const { startIndex, deleteCount, insertCount } = {
    startIndex: 0,
    deleteCount: 0,
    insertCount: 0,
    ...props,
  }
  const path = field.path.toString()
  const addrLength = path.length
  const { fields } = field.form
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
  return fieldPatches
}

export const exchangeArrayState = (
  field: ArrayField,
  props: {
    fromIndex?: number
    toIndex?: number
  }
): INodePatch<Field<any, any>>[] => {
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
  return fieldPatches
}
