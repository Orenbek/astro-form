import { createForm } from '../src/index'
import { LifeCycles } from '../src/types'

import { attach, sleep } from './shared'

test('onFormInit/onFormMount/onFormUnmount', () => {
  const mount = jest.fn()
  const init = jest.fn()
  const unmount = jest.fn()
  const form = attach(
    createForm({
      effects(f) {
        f.on(LifeCycles.ON_FORM_INIT, init)
        f.on(LifeCycles.ON_FORM_MOUNT, mount)
        f.on(LifeCycles.ON_FORM_UNMOUNT, unmount)
      },
    })!
  )
  expect(init).toBeCalled()
  expect(mount).toBeCalled()
  expect(unmount).not.toBeCalled()
  form.onUnmount()
  expect(unmount).toBeCalled()
})

test('onFormValuesChange/onFormInitialValuesChange', async () => {
  const valuesChange = jest.fn()
  const initialValuesChange = jest.fn()
  const form = attach(createForm({}))
  form.addEffects('xx', (f) => {
    f.on(LifeCycles.ON_FORM_VALUES_CHANGE, valuesChange)
    f.on(LifeCycles.ON_FORM_INITIAL_VALUES_CHANGE, initialValuesChange)
  })
  expect(valuesChange).not.toBeCalled()
  expect(initialValuesChange).not.toBeCalled()
  form.setValues({ aa: '123' })
  expect(form.values.aa).toEqual('123')
  expect(valuesChange).toBeCalled()
  form.setInitialValues({
    aa: '321',
    bb: '123',
  })
  // 因为 aa bb 对应的 field 并不存在，因此此时修改 initialValues 并不会修改 values。
  expect(form.values.aa).toEqual('123')
  expect(form.values.bb).toEqual(undefined)
  expect(initialValuesChange).toBeCalled()

  const cc = attach(
    form.createField({
      name: 'cc',
      initialValue: 'test',
    })!
  )
  expect(form.values.cc).toEqual('test')
  form.setInitialValues({
    cc: 'test2',
  })
  expect(form.values.cc).toEqual('test')
})

test('onFormInputChange', () => {
  const inputChange = jest.fn()
  const valuesChange = jest.fn()
  const form = attach(createForm({}))
  form.addEffects('xx', (f) => {
    f.on(LifeCycles.ON_FORM_VALUES_CHANGE, valuesChange)
    f.on(LifeCycles.ON_FORM_INPUT_CHANGE, inputChange)
  })
  const field = attach(
    form.createField({
      name: 'aa',
    })!
  )
  expect(inputChange).not.toBeCalled()
  expect(valuesChange).not.toBeCalled()
  field.setValue('123')
  expect(inputChange).not.toBeCalled()
  expect(valuesChange).toBeCalledTimes(1)
  field.onInput('123')
  expect(inputChange).toBeCalled()
  expect(valuesChange).toBeCalledTimes(1)
  field.onInput('321')
  expect(inputChange).toBeCalledTimes(2)
  expect(valuesChange).toBeCalledTimes(2)
})

test('onFormReset', async () => {
  const reset = jest.fn()
  const form = attach(
    createForm({
      initialValues: {
        aa: 123,
      },
    })
  )
  form.addEffects('xx', (f) => {
    f.on(LifeCycles.ON_FORM_RESET, reset)
  })

  const field = attach(
    form.createField({
      name: 'aa',
    })!
  )

  field.setValue('xxxx')

  expect(field.value).toEqual('xxxx')
  expect(form.values.aa).toEqual('xxxx')
  expect(reset).not.toBeCalled()
  await form.reset()
  expect(field.value).toEqual(123)
  expect(form.values.aa).toEqual(123)
  expect(reset).toBeCalled()
})

test('onFormSubmit', async () => {
  const submit = jest.fn()
  const submitStart = jest.fn()
  const submitEnd = jest.fn()
  const submitSuccess = jest.fn()
  const submitFailed = jest.fn()
  const submitValidateStart = jest.fn()
  const submitValidateFailed = jest.fn()
  const submitValidateSuccess = jest.fn()
  const submitValidateEnd = jest.fn()
  const form = attach(createForm({}))
  form.addEffects('xx', (f) => {
    f.on(LifeCycles.ON_FORM_SUBMIT_START, submitStart)
    f.on(LifeCycles.ON_FORM_SUBMIT, submit)
    f.on(LifeCycles.ON_FORM_SUBMIT_END, submitEnd)
    f.on(LifeCycles.ON_FORM_SUBMIT_FAILED, submitFailed)
    f.on(LifeCycles.ON_FORM_SUBMIT_SUCCESS, submitSuccess)
    f.on(LifeCycles.ON_FORM_SUBMIT_VALIDATE_START, submitValidateStart)
    f.on(LifeCycles.ON_FORM_SUBMIT_VALIDATE_FAILED, submitValidateFailed)
    f.on(LifeCycles.ON_FORM_SUBMIT_VALIDATE_SUCCESS, submitValidateSuccess)
    f.on(LifeCycles.ON_FORM_SUBMIT_VALIDATE_END, submitValidateEnd)
  })

  const field = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  try {
    await form.submit()
  } catch {}
  expect(submitStart).toBeCalled()
  expect(submit).toBeCalled()
  expect(submitEnd).toBeCalled()
  expect(submitSuccess).not.toBeCalled()
  expect(submitFailed).toBeCalled()
  expect(submitValidateStart).toBeCalled()
  expect(submitValidateFailed).toBeCalled()
  expect(submitValidateSuccess).not.toBeCalled()
  expect(submitValidateEnd).toBeCalled()
  field.onInput('123')
  try {
    await form.submit()
  } catch (e) {}
  expect(submitStart).toBeCalledTimes(2)
  expect(submit).toBeCalledTimes(2)
  expect(submitEnd).toBeCalledTimes(2)
  expect(submitSuccess).toBeCalledTimes(1)
  expect(submitFailed).toBeCalledTimes(1)
  expect(submitValidateStart).toBeCalledTimes(2)
  expect(submitValidateFailed).toBeCalledTimes(1)
  expect(submitValidateSuccess).toBeCalledTimes(1)
  expect(submitValidateEnd).toBeCalledTimes(2)
})

test('onFormValidate', async () => {
  const validateStart = jest.fn()
  const validateEnd = jest.fn()
  const validateFailed = jest.fn()
  const validateSuccess = jest.fn()
  const form = attach(createForm({}))
  form.addEffects('xx', (f) => {
    f.on(LifeCycles.ON_FORM_VALIDATE_START, validateStart)
    f.on(LifeCycles.ON_FORM_VALIDATE_END, validateEnd)
    f.on(LifeCycles.ON_FORM_VALIDATE_FAILED, validateFailed)
    f.on(LifeCycles.ON_FORM_VALIDATE_SUCCESS, validateSuccess)
  })
  const field = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  try {
    await form.validate()
  } catch {}
  expect(validateStart).toBeCalled()
  expect(validateEnd).toBeCalled()
  expect(validateFailed).toBeCalled()
  expect(validateSuccess).not.toBeCalled()
  field.onInput('123')
  try {
    await form.validate()
  } catch {}
  expect(validateStart).toBeCalledTimes(2)
  expect(validateEnd).toBeCalledTimes(2)
  expect(validateFailed).toBeCalledTimes(1)
  expect(validateSuccess).toBeCalledTimes(1)
})

test('onFieldInit/onFieldMount/onFieldUnmount', () => {
  const fieldInit = jest.fn()
  const fieldMount = jest.fn()
  const fieldUnmount = jest.fn()
  const form = attach(createForm())
  form.addEffects('xx', (f) => {
    f.on(LifeCycles.ON_FIELD_INIT, 'aa', fieldInit)
    f.on(LifeCycles.ON_FIELD_MOUNT, 'aa', fieldMount)
    f.on(LifeCycles.ON_FIELD_UNMOUNT, 'aa', fieldUnmount)
  })
  const field = attach(
    form.createField({
      name: 'aa',
    })!
  )
  expect(fieldInit).toBeCalledTimes(1)
  expect(fieldMount).toBeCalledTimes(1)
  expect(fieldUnmount).toBeCalledTimes(0)
  field.onUnmount()
  expect(fieldUnmount).toBeCalledTimes(1)
})

test('onFieldInitialValueChange/onFieldValueChange/onFieldInputValueChange', () => {
  const fieldValueChange = jest.fn()
  const fieldInitialValueChange = jest.fn()
  const fieldInputValueChange = jest.fn()
  const fieldValueChange2 = jest.fn()
  const form = attach(createForm())
  form.addEffects('xx', (f) => {
    f.on(LifeCycles.ON_FIELD_INITIAL_VALUE_CHANGE, 'aa', fieldInitialValueChange)
    f.on(LifeCycles.ON_FIELD_VALUE_CHANGE, 'aa', fieldValueChange)
    f.on(LifeCycles.ON_FIELD_INPUT_VALUE_CHANGE, 'aa', fieldInputValueChange)
    f.on(LifeCycles.ON_FIELD_VALUE_CHANGE, 'aa', fieldValueChange2)
  })
  const field = attach(
    form.createField({
      name: 'aa',
    })!
  )
  field.setValue('123')
  expect(fieldValueChange).toBeCalledTimes(1)
  expect(fieldInitialValueChange).toBeCalledTimes(0)
  expect(fieldInputValueChange).toBeCalledTimes(0)
  field.setInitialValue('xxx')
  expect(fieldValueChange).toBeCalledTimes(1)
  expect(fieldInitialValueChange).toBeCalledTimes(1)
  expect(fieldInputValueChange).toBeCalledTimes(0)
  field.onInput('321')
  expect(fieldValueChange).toBeCalledTimes(2)
  expect(fieldInitialValueChange).toBeCalledTimes(1)
  expect(fieldInputValueChange).toBeCalledTimes(1)
  expect(fieldValueChange2).toBeCalledTimes(2)
})

test('onFieldValidate', async () => {
  const validateStart = jest.fn()
  const validateFailed = jest.fn()
  const validateSuccess = jest.fn()
  const validateEnd = jest.fn()
  const form = attach(createForm())
  form.addEffects('xx', (f) => {
    f.on(LifeCycles.ON_FIELD_VALIDATE_START, 'aa', validateStart)
    f.on(LifeCycles.ON_FIELD_VALIDATE_END, 'aa', validateEnd)
    f.on(LifeCycles.ON_FIELD_VALIDATE_FAILED, 'aa', validateFailed)
    f.on(LifeCycles.ON_FIELD_VALIDATE_SUCCESS, 'aa', validateSuccess)
  })
  const field = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  try {
    await field.validate()
  } catch {}
  expect(validateStart).toBeCalled()
  expect(validateFailed).toBeCalled()
  expect(validateSuccess).not.toBeCalled()
  expect(validateEnd).toBeCalled()
  field.setValue('123')
  try {
    await field.validate()
  } catch {}
  expect(validateStart).toBeCalledTimes(2)
  expect(validateFailed).toBeCalledTimes(1)
  expect(validateSuccess).toBeCalledTimes(1)
  expect(validateEnd).toBeCalledTimes(2)
})

test('async use will not throw error', async () => {
  const valueChange = jest.fn()
  let error
  const form = attach(createForm())
  form.addEffects('xx', (f) => {
    setTimeout(() => {
      try {
        f.on(LifeCycles.ON_FIELD_VALUE_CHANGE, 'aa', valueChange)
      } catch (e) {
        error = e
      }
    }, 0)
  })
  const aa = attach(
    form.createField({
      name: 'aa',
    })!
  )
  await sleep(10)
  aa.setValue('123')
  expect(valueChange).toBeCalledTimes(1)
  expect(error).toBeUndefined()
})
