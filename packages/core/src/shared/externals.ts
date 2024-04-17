import { FormPath } from '@formily/shared'
import {
  getValidateLocaleIOSCode,
  getLocaleByPath,
  setValidateLanguage,
  registerValidateFormats,
  registerValidateLocale,
  registerValidateMessageTemplateEngine,
  registerValidateRules,
} from '@formily/validator'

import { Form } from '../models'
import { IFormProps } from '../types'

import { isArrayField, isField, isForm, isGeneralField, isObjectField, isQuery } from './checkers'

const createForm = <T extends object = any>(options: IFormProps<T>) => {
  return new Form(options)
}

export {
  FormPath,
  createForm,
  isArrayField,
  isField,
  isForm,
  isGeneralField,
  isObjectField,
  isQuery,
  getValidateLocaleIOSCode,
  getLocaleByPath,
  setValidateLanguage,
  registerValidateFormats,
  registerValidateLocale,
  registerValidateMessageTemplateEngine,
  registerValidateRules,
}
