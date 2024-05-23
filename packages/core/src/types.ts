import { Path as FormPath, Pattern as FormPathPattern } from '@formily/path'
import { IValidatorRules, Validator, ValidatorTriggerType } from '@formily/validator'

import type { FieldPlugin } from './plugins/type'
import type { Form, Field, ArrayField, ObjectField } from './models'

export { FormPath, type FormPathPattern }

export type JSXComponent = any

export enum LifeCycles {
  /**
   * Form LifeCycle
   * */

  ON_FORM_INIT = 'onFormInit',
  ON_FORM_MOUNT = 'onFormMount',
  ON_FORM_UNMOUNT = 'onFormUnmount',

  ON_FORM_INPUT_CHANGE = 'onFormInputChange',
  ON_FORM_VALUES_CHANGE = 'onFormValuesChange',
  ON_FORM_INITIAL_VALUES_CHANGE = 'onFormInitialValuesChange',

  ON_FORM_SUBMIT = 'onFormSubmit',
  ON_FORM_RESET = 'onFormReset',
  ON_FORM_SUBMIT_START = 'onFormSubmitStart',
  ON_FORM_SUBMITTING = 'onFormSubmitting',
  ON_FORM_SUBMIT_END = 'onFormSubmitEnd',
  ON_FORM_SUBMIT_VALIDATE_START = 'onFormSubmitValidateStart',
  ON_FORM_SUBMIT_VALIDATE_SUCCESS = 'onFormSubmitValidateSuccess',
  ON_FORM_SUBMIT_VALIDATE_FAILED = 'onFormSubmitValidateFailed',
  ON_FORM_SUBMIT_VALIDATE_END = 'onFormSubmitValidateEnd',
  ON_FORM_SUBMIT_SUCCESS = 'onFormSubmitSuccess',
  ON_FORM_SUBMIT_FAILED = 'onFormSubmitFailed',
  ON_FORM_VALIDATE_START = 'onFormValidateStart',
  ON_FORM_VALIDATING = 'onFormValidating',
  ON_FORM_VALIDATE_SUCCESS = 'onFormValidateSuccess',
  ON_FORM_VALIDATE_FAILED = 'onFormValidateFailed',
  ON_FORM_VALIDATE_END = 'onFormValidateEnd',

  ON_FORM_GRAPH_CHANGE = 'onFormGraphChange',
  ON_FORM_LOADING = 'onFormLoading',

  /**
   * Field LifeCycle
   * */

  ON_FIELD_INIT = 'onFieldInit',
  ON_FIELD_INPUT_VALUE_CHANGE = 'onFieldInputValueChange',
  ON_FIELD_VALUE_CHANGE = 'onFieldValueChange',
  ON_FIELD_INITIAL_VALUE_CHANGE = 'onFieldInitialValueChange',

  ON_FIELD_SUBMIT = 'onFieldSubmit',
  ON_FIELD_SUBMIT_START = 'onFieldSubmitStart',
  ON_FIELD_SUBMITTING = 'onFieldSubmitting',
  ON_FIELD_SUBMIT_END = 'onFieldSubmitEnd',
  ON_FIELD_SUBMIT_VALIDATE_START = 'onFieldSubmitValidateStart',
  ON_FIELD_SUBMIT_VALIDATE_SUCCESS = 'onFieldSubmitValidateSuccess',
  ON_FIELD_SUBMIT_VALIDATE_FAILED = 'onFieldSubmitValidateFailed',
  ON_FIELD_SUBMIT_VALIDATE_END = 'onFieldSubmitValidateEnd',
  ON_FIELD_SUBMIT_SUCCESS = 'onFieldSubmitSuccess',
  ON_FIELD_SUBMIT_FAILED = 'onFieldSubmitFailed',
  ON_FIELD_VALIDATE_START = 'onFieldValidateStart',
  ON_FIELD_VALIDATING = 'onFieldValidating',
  ON_FIELD_VALIDATE_SUCCESS = 'onFieldValidateSuccess',
  ON_FIELD_VALIDATE_FAILED = 'onFieldValidateFailed',
  ON_FIELD_VALIDATE_END = 'onFieldValidateEnd',

  ON_FIELD_LOADING = 'onFieldLoading',
  ON_FIELD_RESET = 'onFieldReset',
  ON_FIELD_MOUNT = 'onFieldMount',
  ON_FIELD_UNMOUNT = 'onFieldUnmount',
}

export type FormLifeCycleUnion =
  | LifeCycles.ON_FORM_INIT
  | LifeCycles.ON_FORM_MOUNT
  | LifeCycles.ON_FORM_UNMOUNT
  | LifeCycles.ON_FORM_INPUT_CHANGE
  | LifeCycles.ON_FORM_VALUES_CHANGE
  | LifeCycles.ON_FORM_INITIAL_VALUES_CHANGE
  | LifeCycles.ON_FORM_SUBMIT
  | LifeCycles.ON_FORM_RESET
  | LifeCycles.ON_FORM_SUBMIT_START
  | LifeCycles.ON_FORM_SUBMITTING
  | LifeCycles.ON_FORM_SUBMIT_END
  | LifeCycles.ON_FORM_SUBMIT_VALIDATE_START
  | LifeCycles.ON_FORM_SUBMIT_VALIDATE_SUCCESS
  | LifeCycles.ON_FORM_SUBMIT_VALIDATE_FAILED
  | LifeCycles.ON_FORM_SUBMIT_VALIDATE_END
  | LifeCycles.ON_FORM_SUBMIT_SUCCESS
  | LifeCycles.ON_FORM_SUBMIT_FAILED
  | LifeCycles.ON_FORM_VALIDATE_START
  | LifeCycles.ON_FORM_VALIDATING
  | LifeCycles.ON_FORM_VALIDATE_SUCCESS
  | LifeCycles.ON_FORM_VALIDATE_FAILED
  | LifeCycles.ON_FORM_VALIDATE_END
  | LifeCycles.ON_FORM_GRAPH_CHANGE
  | LifeCycles.ON_FORM_LOADING

export type FieldLifeCycleUnion =
  | LifeCycles.ON_FIELD_INIT
  | LifeCycles.ON_FIELD_INPUT_VALUE_CHANGE
  | LifeCycles.ON_FIELD_VALUE_CHANGE
  | LifeCycles.ON_FIELD_INITIAL_VALUE_CHANGE
  | LifeCycles.ON_FIELD_SUBMIT
  | LifeCycles.ON_FIELD_SUBMIT_START
  | LifeCycles.ON_FIELD_SUBMITTING
  | LifeCycles.ON_FIELD_SUBMIT_END
  | LifeCycles.ON_FIELD_SUBMIT_VALIDATE_START
  | LifeCycles.ON_FIELD_SUBMIT_VALIDATE_SUCCESS
  | LifeCycles.ON_FIELD_SUBMIT_VALIDATE_FAILED
  | LifeCycles.ON_FIELD_SUBMIT_VALIDATE_END
  | LifeCycles.ON_FIELD_SUBMIT_SUCCESS
  | LifeCycles.ON_FIELD_SUBMIT_FAILED
  | LifeCycles.ON_FIELD_VALIDATE_START
  | LifeCycles.ON_FIELD_VALIDATING
  | LifeCycles.ON_FIELD_VALIDATE_SUCCESS
  | LifeCycles.ON_FIELD_VALIDATE_FAILED
  | LifeCycles.ON_FIELD_VALIDATE_END
  | LifeCycles.ON_FIELD_LOADING
  | LifeCycles.ON_FIELD_RESET
  | LifeCycles.ON_FIELD_MOUNT
  | LifeCycles.ON_FIELD_UNMOUNT

export type FieldDisplayTypes = 'none' | 'hidden' | 'visible' | (object & string)

export type FieldPatternTypes = 'editable' | 'disabled' | 'readPretty' | (object & string)

export type FieldComponent<Component extends JSXComponent, ComponentProps extends object = object> =
  | [Component]
  | [Component, ComponentProps]

export type FieldValidatorContext = IValidatorRules & {
  field?: Field
  form?: Form
  value?: any
}

export type FieldValidator = Validator<FieldValidatorContext>

export type FieldDataSource = {
  label: any
  value: any
  key?: any
  children?: FieldDataSource
  [key: string]: any
}[]

export interface IBaseFieldProps<Component extends JSXComponent = any, ValueType = any> {
  value?: ValueType
  initialValue?: ValueType
  required?: boolean
  display?: FieldDisplayTypes
  pattern?: FieldPatternTypes
  hidden?: boolean
  visible?: boolean
  editable?: boolean
  disabled?: boolean
  readPretty?: boolean
  dataSource?: FieldDataSource
  validator?: FieldValidator
  component?: FieldComponent<Component>
  data?: any
  validateFirst?: boolean
  reactions?: FieldReaction[] | FieldReaction
}

export interface IFieldProps<Component extends JSXComponent = any, ValueType = any>
  extends IBaseFieldProps<Component, ValueType> {
  plugins?: {
    new (field: Field): FieldPlugin
  }[]
}

export type FieldReaction = (field: Field) => void

export interface IFieldFeedback {
  triggerType?: ValidatorTriggerType
  type: FieldFeedbackTypes
  code?: FieldFeedbackCodeTypes
  messages: string[]
}
export type FieldFeedbackTypes = 'error' | 'success' | 'warning'
export type FieldFeedbackCodeTypes =
  | 'ValidateError'
  | 'ValidateSuccess'
  | 'ValidateWarning'
  | 'EffectError'
  | 'EffectSuccess'
  | 'EffectWarning'

export type ISearchFeedback = {
  triggerType?: ValidatorTriggerType
  type?: FieldFeedbackTypes
  code?: FieldFeedbackCodeTypes
  path?: string
}
export type IFormFeedback = IFieldFeedback & { path: string }

export interface IFieldResetOptions {
  forceClear?: boolean // 是否强制清除
  validate?: boolean // 是否校验
}
export type IFormFields = Record<string, Field | ArrayField | ObjectField>

export type FormPatternTypes = FieldPatternTypes
export type FormDisplayTypes = FieldDisplayTypes

export interface IFormProps<ValueType extends object = any> {
  values?: Partial<ValueType>
  initialValues?: Partial<ValueType>
  pattern?: FormPatternTypes
  display?: FormDisplayTypes
  hidden?: boolean
  visible?: boolean
  editable?: boolean
  disabled?: boolean
  readOnly?: boolean
  readPretty?: boolean
  validateFirst?: boolean
  effects?: (form: Form<ValueType>) => void
}

export interface IFieldFactoryProps<Component extends JSXComponent, ValueType = any>
  extends IFieldProps<Component, ValueType> {
  name: FormPathPattern
  basePath?: FormPathPattern
}

export type GeneralField = Field | ArrayField | ObjectField
