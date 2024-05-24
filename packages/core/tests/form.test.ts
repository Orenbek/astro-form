/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-plusplus */
/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */

import { createForm, LifeCycles } from '../src/index'

import { attach, sleep } from './shared'

test('create form', () => {
  const form = attach(createForm())
  expect(form).not.toBeUndefined()
})

test('createField/createArrayField/createObjectField/createVoidField', () => {
  const form = attach(createForm())
  const normal = attach(
    form.createField({
      name: 'normal',
      basePath: 'parent',
    })!
  )
  const normal2 = attach(
    form.createField({
      name: 'normal',
      basePath: 'parent',
    })!
  )
  const array_ = attach(form.createArrayField({ name: 'array', basePath: 'parent' })!)
  const array2_ = attach(form.createArrayField({ name: 'array', basePath: 'parent' })!)
  const object_ = attach(form.createObjectField({ name: 'object', basePath: 'parent' })!)
  const object2_ = attach(form.createObjectField({ name: 'object', basePath: 'parent' })!)
  const children_ = attach(form.createField({ name: 'children', basePath: 'parent.void' })!)
  expect(normal).not.toBeUndefined()
  expect(array_).not.toBeUndefined()
  expect(object_).not.toBeUndefined()
  expect(normal.path.toString()).toEqual('parent.normal')
  expect(normal.path.toString()).toEqual('parent.normal')
  expect(array_.path.toString()).toEqual('parent.array')
  expect(array_.path.toString()).toEqual('parent.array')
  expect(object_.path.toString()).toEqual('parent.object')
  expect(object_.path.toString()).toEqual('parent.object')
  expect(children_.path.toString()).toEqual('parent.void.children')
  expect(form.createField({ name: '' })).toBeUndefined()
  expect(form.createArrayField({ name: '' })).toBeUndefined()
  expect(form.createObjectField({ name: '' })).toBeUndefined()
  expect(array_ === array2_).toBeTruthy()
  expect(object_ === object2_).toBeTruthy()
  expect(normal === normal2).toBeTruthy()
})

test('setValues/setInitialValues', () => {
  const form = attach(createForm())
  form.setValues({
    aa: 123,
    cc: {
      kk: 321,
    },
  })
  const field = attach(
    form.createField({
      name: 'cc.mm',
      initialValue: 'ooo',
    })!
  )
  const field2 = attach(
    form.createField({
      name: 'cc.pp',
      initialValue: 'www',
    })!
  )
  expect(form.values.aa).toEqual(123)
  expect(form.values.cc.kk).toEqual(321)
  expect(form.values.cc.mm).toEqual('ooo')
  expect(form.initialValues.cc.mm).toEqual('ooo')
  expect(form.values.cc.pp).toEqual('www')
  expect(form.initialValues.cc.pp).toEqual('www')
  expect(field.value).toEqual('ooo')
  expect(field2.value).toEqual('www')
  form.setInitialValues({
    bb: '123',
    cc: {
      dd: 'xxx',
      pp: 'www2',
    },
  })
  expect(form.values.aa).toEqual(123)
  // 因为 bb 这个 key 没有绑定的 field 因此 form.values.bb 还是 undefined
  expect(form.values.bb).toEqual(undefined)
  expect(form.values.cc.kk).toEqual(321)
  expect(form.values.cc.dd).toEqual(undefined)
  expect(form.initialValues.bb).toEqual('123')
  expect(form.initialValues.cc.kk).toBeUndefined()
  expect(form.initialValues.cc.dd).toEqual('xxx')
  expect(form.values.cc.mm).toEqual('ooo')
  expect(form.initialValues.cc.mm).toEqual('ooo')
  expect(field.value).toEqual('ooo')
  expect(form.values.cc.pp).toEqual('www')
  expect(form.initialValues.cc.pp).toEqual('www2')
  expect(field2.value).toEqual('www')
  form.setInitialValues({}, 'overwrite')
  expect(form.initialValues?.cc?.pp).toBeUndefined()
  form.setValues({}, 'overwrite')
  expect(form.values.aa).toBeUndefined()
  form.setInitialValues({ aa: { bb: [{ cc: 123 }] } })
  expect(form.values).toEqual({})
})

test('no field initialValues not merge', () => {
  const form = attach(
    createForm<any>({
      values: {
        aa: '123',
      },
      initialValues: {
        aa: '333',
        bb: '321',
      },
    })
  )

  expect(form.values).toEqual({
    aa: '123',
  })
})

test('setLoading', async () => {
  const form = attach(createForm())
  expect(form.loading).toBeFalsy()
  form.setLoading(true)
  await sleep(100)
  expect(form.loading).toBeTruthy()
})

test('setValues with null', () => {
  const form = attach(createForm())
  form.setInitialValues({
    'object-1': {
      'array-1': null,
    },
    'object-2': {
      'array-2': null,
    },
  })
  form.setValues({
    'object-1': {
      'array-1': null,
    },
    'object-2': {
      'array-2': null,
    },
  })
  expect(form.values).toEqual({
    'object-1': {
      'array-1': null,
    },
    'object-2': {
      'array-2': null,
    },
  })
})

test('deleteValuesIn/deleteInitialValuesIn', () => {
  const form = attach(
    createForm<{
      aa?: number
      bb?: number
    }>({
      values: {
        aa: 123,
      },
      initialValues: {
        bb: 123,
      },
    })
  )
  expect(form.values.aa).toEqual(123)
  expect(form.values.bb).toEqual(undefined)
  form.deleteValuesIn('aa')
  form.deleteInitialValuesIn('bb')
  expect(form.existValuesIn('aa')).toBeFalsy()
  expect(form.existInitialValuesIn('bb')).toBeFalsy()
})

test('setSubmitting/setValidating', async () => {
  const form = attach(createForm())
  form.setSubmitting(true)
  expect(form.submitting).toBeTruthy()
  form.setSubmitting(false)
  expect(form.submitting).toBeFalsy()
  form.setValidating(true)
  expect(form.validating).toBeTruthy()
  form.setValidating(false)
  expect(form.validating).toBeFalsy()
})

test('setEffects/addEffects/removeEffects', () => {
  const form = attach(createForm())
  const valueChange = jest.fn()
  const valueChange2 = jest.fn()
  form.addEffects('e1', () => {
    form.on(LifeCycles.ON_FIELD_VALUE_CHANGE, 'aa', valueChange)
  })
  const field = attach(
    form.createField({
      name: 'aa',
    })!
  )
  field.setValue('123')
  expect(valueChange).toBeCalledTimes(1)
  form.removeEffects('e1')
  field.setValue('321')
  expect(valueChange).toBeCalledTimes(1)
  form.addEffects('e2', () => {
    form.on(LifeCycles.ON_FIELD_VALUE_CHANGE, 'aa', valueChange)
  })
  field.setValue('444')
  expect(valueChange).toBeCalledTimes(2)
  form.addEffects('test', () => {
    form.on(LifeCycles.ON_FIELD_VALUE_CHANGE, 'aa', valueChange2)
  })
  field.setValue('555')
  expect(valueChange).toBeCalledTimes(3)
  expect(valueChange2).toBeCalledTimes(1)
})

test('query', () => {
  const form = attach(createForm())
  attach(
    form.createObjectField({
      name: 'object',
    })!
  )
  attach(
    form.createField({
      name: 'normal',
      basePath: 'object.void',
    })!
  )
  attach(
    form.createArrayField({
      name: 'array',
    })!
  )
  expect(form.query('object').take()).not.toBeUndefined()
  expect(form.query('object.void').take()).toBeUndefined()
  expect(form.query('object.void.normal').take()).not.toBeUndefined()
  expect(form.query('object.*').map((field) => field.path.toString())).toEqual(['object.void.normal'])
  expect(form.query('*').map((field) => field.path.toString())).toEqual(['object', 'object.void.normal', 'array'])
  expect(form.query('array').take()).not.toBeUndefined()
  expect(form.query('*').take()).not.toBeUndefined()
  expect(form.query('*(oo)').take()).toBeUndefined()
  expect(form.query('*(oo)').map()).toEqual([])
  expect(form.query('object.void').take()).toBeUndefined()
  expect(form.query('array').take()!.value).toEqual([])
  expect(form.query('array').take()!.initialValue).toEqual([])
  expect(form.query('array').take()!.inputValue).toBeNull()
  form.query('array').forEach((field) => {
    field.value = [111]
    field.initialValue = [111]
    field.inputValue = [111]
  })
  expect(form.query('array').take()!.value).toEqual([111])
  expect(form.query('array').take()!.initialValue).toEqual([111])
  expect(form.query('array').take()!.inputValue).toEqual([111])
  expect(form.query('array').getIn('inputValue')).toEqual([111])
})

test('validate/valid/invalid/errors/warnings/successes/clearErrors/clearWarnings/clearSuccesses/queryFeedbacks', async () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
      required: true,
      validator(value) {
        if (value === '123') {
          return {
            type: 'success',
            message: 'success',
          }
        }
        if (value === '321') {
          return {
            type: 'warning',
            message: 'warning',
          }
        }
        if (value === '111') {
          return 'error'
        }
      },
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      required: true,
    })!
  )
  try {
    await form.validate()
  } catch {}
  expect(form.invalid).toBeTruthy()
  expect(form.valid).toBeFalsy()
  expect(form.errors).toEqual([
    {
      type: 'error',
      path: 'aa',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['The field value is required'],
    },
    {
      type: 'error',
      path: 'bb',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['The field value is required'],
    },
  ])
  await aa.onInput('123')
  expect(form.errors).toEqual([
    {
      type: 'error',
      path: 'bb',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['The field value is required'],
    },
  ])
  expect(form.successes).toEqual([
    {
      type: 'success',
      path: 'aa',
      code: 'ValidateSuccess',
      triggerType: 'onInput',
      messages: ['success'],
    },
  ])
  await aa.onInput('321')
  expect(form.errors).toEqual([
    {
      type: 'error',
      path: 'bb',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['The field value is required'],
    },
  ])
  expect(form.warnings).toEqual([
    {
      type: 'warning',
      path: 'aa',
      code: 'ValidateWarning',
      triggerType: 'onInput',
      messages: ['warning'],
    },
  ])
  await aa.onInput('111')
  expect(form.errors).toEqual([
    {
      type: 'error',
      path: 'aa',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['error'],
    },
    {
      type: 'error',
      path: 'bb',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['The field value is required'],
    },
  ])
  await aa.onInput('yes')
  await bb.onInput('yes')
  await form.validate()
  expect(form.invalid).toBeFalsy()
  expect(form.valid).toBeTruthy()
  expect(form.errors).toEqual([])
  expect(form.successes).toEqual([])
  expect(form.warnings).toEqual([])
  await aa.onInput('')
  await bb.onInput('')
  try {
    await form.validate()
  } catch {}
  expect(form.errors).toEqual([
    {
      type: 'error',
      path: 'aa',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['The field value is required'],
    },
    {
      type: 'error',
      path: 'bb',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['The field value is required'],
    },
  ])
  form.clearErrors('aa')
  expect(form.errors).toEqual([
    {
      type: 'error',
      path: 'bb',
      code: 'ValidateError',
      triggerType: 'onInput',
      messages: ['The field value is required'],
    },
  ])
  form.clearErrors('*')
  expect(form.errors).toEqual([])
  await aa.onInput('123')
  expect(form.errors).toEqual([])
  expect(form.successes).toEqual([
    {
      type: 'success',
      path: 'aa',
      code: 'ValidateSuccess',
      triggerType: 'onInput',
      messages: ['success'],
    },
  ])
  form.clearSuccesses('aa')
  expect(form.successes).toEqual([])
  await aa.onInput('321')
  expect(form.errors).toEqual([])
  expect(form.successes).toEqual([])
  expect(form.warnings).toEqual([
    {
      type: 'warning',
      path: 'aa',
      code: 'ValidateWarning',
      triggerType: 'onInput',
      messages: ['warning'],
    },
  ])
  form.clearWarnings('*')
  expect(form.errors).toEqual([])
  expect(form.successes).toEqual([])
  expect(form.warnings).toEqual([])
  await aa.onInput('123')
  await bb.onInput('')
  expect(
    form.queryFeedbacks({
      type: 'error',
    }).length
  ).toEqual(1)
  expect(
    form.queryFeedbacks({
      type: 'success',
    }).length
  ).toEqual(1)
  expect(
    form.queryFeedbacks({
      code: 'ValidateError',
    }).length
  ).toEqual(1)
  expect(
    form.queryFeedbacks({
      code: 'ValidateSuccess',
    }).length
  ).toEqual(1)
  expect(
    form.queryFeedbacks({
      code: 'EffectError',
    }).length
  ).toEqual(0)
  expect(
    form.queryFeedbacks({
      code: 'EffectSuccess',
    }).length
  ).toEqual(0)
  expect(
    form.queryFeedbacks({
      path: 'aa',
    }).length
  ).toEqual(1)
  expect(
    form.queryFeedbacks({
      path: 'bb',
    }).length
  ).toEqual(1)
  expect(
    form.queryFeedbacks({
      path: 'aa',
    }).length
  ).toEqual(1)
  expect(
    form.queryFeedbacks({
      path: 'bb',
    }).length
  ).toEqual(1)
  aa.setValue('')
  bb.setValue('')
  form.clearErrors()
  form.clearSuccesses()
  form.clearWarnings()
  try {
    await form.validate('aa')
  } catch {}
  expect(
    form.queryFeedbacks({
      type: 'error',
    }).length
  ).toEqual(1)
  try {
    await form.validate('*')
  } catch {}
  expect(
    form.queryFeedbacks({
      type: 'error',
    }).length
  ).toEqual(2)
})

// test('setPattern/pattern/editable/readOnly/disabled/readPretty', () => {
//   const form = attach(
//     createForm({
//       pattern: 'disabled',
//     })
//   )
//   const field = attach(
//     form.createField({
//       name: 'aa',
//     })!
//   )
//   expect(form.pattern).toEqual('disabled')
//   expect(form.disabled).toBeTruthy()
//   expect(field.pattern).toEqual('disabled')
//   expect(field.disabled).toBeTruthy()
//   form.setPattern('readPretty')
//   expect(form.pattern).toEqual('readPretty')
//   expect(form.readPretty).toBeTruthy()
//   expect(field.pattern).toEqual('readPretty')
//   expect(field.readPretty).toBeTruthy()
//   const form2 = attach(
//     createForm({
//       editable: false,
//     })
//   )
//   expect(form2.pattern).toEqual('readPretty')
//   expect(form2.readPretty).toBeTruthy()
//   const form3 = attach(
//     createForm({
//       disabled: true,
//     })
//   )
//   expect(form3.pattern).toEqual('disabled')
//   expect(form3.disabled).toBeTruthy()
//   const form4 = attach(
//     createForm({
//       disabled: false,
//     })
//   )
//   expect(form4.pattern).toEqual('disabled')
//   expect(form4.disabled).toBeTruthy()
//   const form5 = attach(
//     createForm({
//       readPretty: true,
//     })
//   )
//   expect(form5.pattern).toEqual('readPretty')
//   expect(form5.readPretty).toBeTruthy()
// })

// test('setDisplay/display/visible/hidden', () => {
//   const form = attach(
//     createForm({
//       display: 'hidden',
//     })
//   )
//   const field = attach(
//     form.createField({
//       name: 'aa',
//     })!
//   )
//   expect(form.display).toEqual('hidden')
//   expect(form.hidden).toBeTruthy()
//   expect(field.display).toEqual('hidden')
//   expect(field.hidden).toBeTruthy()
//   form.setDisplay('visible')
//   expect(form.display).toEqual('visible')
//   expect(form.visible).toBeTruthy()
//   expect(field.display).toEqual('visible')
//   expect(field.visible).toBeTruthy()
//   form.setDisplay('none')
//   expect(form.display).toEqual('none')
//   expect(form.visible).toBeFalsy()
//   expect(field.display).toEqual('none')
//   expect(field.visible).toBeFalsy()
//   const form2 = attach(
//     createForm({
//       hidden: true,
//     })
//   )
//   expect(form2.display).toEqual('hidden')
//   expect(form2.hidden).toBeTruthy()
//   expect(form2.visible).toBeFalsy()
//   const form3 = attach(
//     createForm({
//       visible: false,
//     })
//   )
//   expect(form3.display).toEqual('none')
//   expect(form3.visible).toBeFalsy()
// })

test('submit', async () => {
  const form = attach(createForm())
  const onSubmit = jest.fn()
  const field = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  let errors1: Error
  try {
    await form.submit(onSubmit)
  } catch (e) {
    errors1 = e as any
  }
  // @ts-ignore
  expect(errors1).not.toBeUndefined()
  expect(onSubmit).toBeCalledTimes(0)
  field.onInput('123')
  await form.submit(onSubmit)
  expect(onSubmit).toBeCalledTimes(1)
  let errors2: Error
  try {
    await form.submit(() => {
      throw new Error('xxx')
    })
  } catch (e) {
    errors2 = e as any
  }
  // @ts-ignore
  expect(errors2).not.toBeUndefined()
  expect(form.valid).toBeTruthy()
})

test('reset', async () => {
  const form = attach(
    createForm<{
      aa?: number
      bb?: number
    }>({
      values: {
        bb: 123,
      },
      initialValues: {
        aa: 123,
      },
    })
  )
  const field = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  const field2 = attach(
    form.createField({
      name: 'bb',
      required: true,
    })!
  )
  expect(field.value).toEqual(123)
  expect(field2.value).toEqual(123)
  expect(form.values.aa).toEqual(123)
  expect(form.values.bb).toEqual(123)
  field.onInput('xxxxx')
  expect(form.values.aa).toEqual('xxxxx')
  try {
    await form.reset()
  } catch {}
  expect(form.valid).toBeTruthy()
  expect(form.values.aa).toEqual(123)
  expect(field.value).toEqual(123)
  expect(form.values.bb).toBeUndefined()
  expect(field2.value).toBeUndefined()
  field.onInput('aaa')
  field2.onInput('bbb')
  expect(form.valid).toBeTruthy()
  expect(form.values.aa).toEqual('aaa')
  expect(field.value).toEqual('aaa')
  expect(form.values.bb).toEqual('bbb')
  expect(field2.value).toEqual('bbb')
  try {
    await form.reset('*', {
      validate: true,
    })
  } catch {}
  expect(form.valid).toBeFalsy()
  expect(form.values.aa).toEqual(123)
  expect(field.value).toEqual(123)
  expect(form.values.bb).toBeUndefined()
  expect(field2.value).toBeUndefined()
  field.onInput('aaa')
  field2.onInput('bbb')
  try {
    await form.reset('*', {
      forceClear: true,
    })
  } catch {}
  expect(form.valid).toBeTruthy()
  expect(form.values.aa).toBeUndefined()
  expect(field.value).toBeUndefined()
  expect(form.values.bb).toBeUndefined()
  expect(field2.value).toBeUndefined()
  field.onInput('aaa')
  field2.onInput('bbb')
  try {
    await form.reset('aa', {
      forceClear: true,
    })
  } catch {}
  expect(form.valid).toBeTruthy()
  expect(form.values.aa).toBeUndefined()
  expect(field.value).toBeUndefined()
  expect(form.values.bb).toEqual('bbb')
  expect(field2.value).toEqual('bbb')
})

test('reset array field', async () => {
  const form = attach(
    createForm({
      values: {
        array: [{ value: 123 }],
      },
    })
  )
  attach(
    form.createArrayField({
      name: 'array',
      required: true,
    })!
  )
  expect(form.values).toEqual({
    array: [{ value: 123 }],
  })
  await form.reset('*', {
    forceClear: true,
  })
  expect(form.values).toEqual({
    array: [],
  })
})

test('reset object field', async () => {
  const form = attach(
    createForm({
      values: {
        object: { value: 123 },
      },
    })
  )
  attach(
    form.createObjectField({
      name: 'object',
      required: true,
    })!
  )
  expect(form.values).toEqual({
    object: { value: 123 },
  })
  await form.reset('*', {
    forceClear: true,
  })
  expect(form.values).toEqual({
    object: {},
  })
})

test('initialValues merge values before create field', () => {
  const form = attach(createForm())
  const array = attach(
    form.createArrayField({
      name: 'array',
    })!
  )
  form.setValues({
    array: [{ aa: '321' }],
  })
  const arr_0_aa = attach(
    form.createField({
      name: 'aa',
      basePath: 'array.0',
      initialValue: '123',
    })!
  )
  expect(array.value).toEqual([{ aa: '321' }])
  expect(arr_0_aa.value).toEqual('321')
})

test('no patch with empty initialValues', () => {
  const form = attach(
    createForm({
      values: {
        array: [1, 2, 3],
      },
    })
  )
  attach(
    form.createObjectField({
      name: 'array.0.1',
    })!
  )

  expect(form.values).toEqual({
    array: [1, 2, 3],
  })
})

test('initialValues merge values after create field', () => {
  const form = attach(createForm())
  const aa = attach(
    form.createArrayField({
      name: 'aa',
      initialValue: ['111'],
    })!
  )
  const array = attach(
    form.createArrayField({
      name: 'array',
    })!
  )
  const arr_0_aa = attach(
    form.createField({
      name: 'aa',
      basePath: 'array.0',
      initialValue: '123',
    })!
  )
  form.setValues({
    aa: '222',
    array: [{ aa: '321' }],
  })
  expect(array.value).toEqual([{ aa: '321' }])
  expect(arr_0_aa.value).toEqual('321')
  expect(aa.value).toEqual('222')
})

test('remove property of form values with undefined value', () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'aaa',
      initialValue: 123,
    })!
  )
  expect(form.values).toMatchObject({ aaa: 123 })
  field.display = 'none'
  // eslint-disable-next-line no-prototype-builtins
  expect(form.values.hasOwnProperty('aaa')).toBeFalsy()
  field.display = 'visible'
  // eslint-disable-next-line no-prototype-builtins
  expect(form.values.hasOwnProperty('aaa')).toBeTruthy()
})

test('empty array initialValues', () => {
  const form = attach(
    createForm({
      initialValues: {
        aa: [0],
        bb: [''],
        cc: [],
        dd: [null],
        ee: [undefined],
      },
    })
  )
  form.createArrayField({
    name: 'aa',
  })
  form.createArrayField({
    name: 'bb',
  })
  form.createArrayField({
    name: 'cc',
  })
  form.createArrayField({
    name: 'dd',
  })
  form.createArrayField({
    name: 'ee',
  })
  expect(form.values.aa).toEqual([0])
  expect(form.values.bb).toEqual([''])
  expect(form.values.cc).toEqual([])
  expect(form.values.dd).toEqual([null])
  expect(form.values.ee).toEqual([undefined])
})

test('form lifecycle can be triggered after call form.setXXX', () => {
  let initialValuesTriggerNum = 0
  let valuesTriggerNum = 0

  const form = attach(
    createForm<{
      aa?: number
      bb?: number
    }>({
      initialValues: {
        aa: 1,
      },
      values: {
        bb: 1,
      },
      effects(f) {
        f.on(LifeCycles.ON_FORM_INITIAL_VALUES_CHANGE, () => {
          initialValuesTriggerNum++
        })
        f.on(LifeCycles.ON_FORM_VALUES_CHANGE, () => {
          valuesTriggerNum++
        })
      },
    })
  )

  expect(initialValuesTriggerNum).toEqual(0)
  expect(valuesTriggerNum).toEqual(0)

  form.setInitialValues({ aa: 2 })
  form.setValues({ bb: 2 })

  expect(initialValuesTriggerNum).toEqual(1)
  expect(valuesTriggerNum).toEqual(1)

  form.setInitialValues({ aa: 3 })
  form.setValues({ bb: 3 })

  expect(initialValuesTriggerNum).toEqual(2)
  expect(valuesTriggerNum).toEqual(2)

  form.setInitialValues({ aa: 4 })
  form.setValues({ bb: 4 })

  expect(initialValuesTriggerNum).toEqual(3)
  expect(valuesTriggerNum).toEqual(3)
})

test('form values change with array field(default value)', async () => {
  const handler = jest.fn()
  const form = attach(createForm())
  form.addEffects('eff', (f) => {
    f.on(LifeCycles.ON_FORM_VALUES_CHANGE, handler)
  })
  const array = attach(
    form.createArrayField({
      name: 'array',
      initialValue: [
        {
          hello: 'world',
        },
      ],
    })!
  )
  await array.push({})
  expect(handler).toBeCalledTimes(2)
})

test('setValues deep merge', () => {
  const form = attach(
    createForm({
      values: {
        aa: {
          bb: 123,
          cc: 321,
          dd: [11, 22, 33],
        },
      },
    })
  )
  expect(form.values).toEqual({
    aa: {
      bb: 123,
      cc: 321,
      dd: [11, 22, 33],
    },
  })
  form.setValues({
    aa: {
      bb: '',
      cc: '',
      dd: [44, 55, 66],
    },
  })
  expect(form.values).toEqual({
    aa: {
      bb: '',
      cc: '',
      dd: [44, 55, 66],
    },
  })
})

test('exception validate', async () => {
  const form = attach(createForm())
  attach(
    form.createField({
      name: 'aa',
      validator() {
        throw new Error('runtime error')
      },
    })!
  )
  try {
    await form.validate()
  } catch {}
  expect(form.invalid).toBeTruthy()
  expect(form.validating).toBeFalsy()
})

test('validate will skip display none', async () => {
  const validateA = jest.fn()
  const validateB = jest.fn()
  const form = attach(createForm({}))
  form.addEffects('eff', (f) => {
    f.on(LifeCycles.ON_FIELD_VALIDATE_START, 'aa', validateA)
    f.on(LifeCycles.ON_FIELD_VALIDATE_START, 'bb', validateB)
  })
  const validator = jest.fn()
  const aa = attach(
    form.createField({
      name: 'aa',
      validator() {
        validator()
        return 'error'
      },
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      validator() {
        validator()
        return 'error'
      },
    })!
  )
  try {
    await form.validate()
  } catch (e) {
    expect(e).toEqual([
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'aa',
      },
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'bb',
      },
    ])
  }
  expect(validateA).toBeCalledTimes(1)
  expect(validateB).toBeCalledTimes(1)
  expect(aa.invalid).toBeTruthy()
  expect(bb.invalid).toBeTruthy()
  expect(validator).toBeCalledTimes(2)
  aa.display = 'none'
  try {
    await form.validate()
  } catch (e) {
    expect(e).toEqual([
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'bb',
      },
    ])
  }
  expect(validateA).toBeCalledTimes(1)
  expect(validateB).toBeCalledTimes(2)
  expect(aa.invalid).toBeFalsy()
  expect(bb.invalid).toBeTruthy()
  expect(validator).toBeCalledTimes(3)
  bb.display = 'none'
  await form.validate()
  expect(validateA).toBeCalledTimes(1)
  expect(validateB).toBeCalledTimes(2)
  expect(aa.invalid).toBeFalsy()
  expect(bb.invalid).toBeFalsy()
  expect(validator).toBeCalledTimes(3)
})

test('validate will skip unmounted', async () => {
  const validateA = jest.fn()
  const validateB = jest.fn()
  const form = attach(createForm({}))
  form.addEffects('eff', (f) => {
    f.on(LifeCycles.ON_FIELD_VALIDATE_START, 'aa', validateA)
    f.on(LifeCycles.ON_FIELD_VALIDATE_START, 'bb', validateB)
  })
  const validator = jest.fn()
  const aa = attach(
    form.createField({
      name: 'aa',
      validator() {
        validator()
        return 'error'
      },
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      validator() {
        validator()
        return 'error'
      },
    })!
  )
  try {
    await form.validate()
  } catch (e) {
    expect(e).toEqual([
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'aa',
      },
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'bb',
      },
    ])
  }
  expect(validateA).toBeCalledTimes(1)
  expect(validateB).toBeCalledTimes(1)
  expect(aa.invalid).toBeTruthy()
  expect(bb.invalid).toBeTruthy()
  expect(validator).toBeCalledTimes(2)
  aa.onUnmount()
  try {
    await form.validate()
  } catch (e) {
    expect(e).toEqual([
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'aa',
      },
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'bb',
      },
    ])
  }
  expect(validateA).toBeCalledTimes(2)
  expect(validateB).toBeCalledTimes(2)
  expect(aa.invalid).toBeTruthy()
  expect(bb.invalid).toBeTruthy()
  expect(validator).toBeCalledTimes(4)
})

test('validate will skip uneditable', async () => {
  const validateA = jest.fn()
  const validateB = jest.fn()
  const form = attach(createForm({}))
  form.addEffects('eff', (f) => {
    f.on(LifeCycles.ON_FIELD_VALIDATE_START, 'aa', validateA)
    f.on(LifeCycles.ON_FIELD_VALIDATE_START, 'bb', validateB)
  })
  const validator = jest.fn()
  const aa = attach(
    form.createField({
      name: 'aa',
      validator() {
        validator()
        return 'error'
      },
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      validator() {
        validator()
        return 'error'
      },
    })!
  )
  try {
    await form.validate()
  } catch (e) {
    expect(e).toEqual([
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'aa',
      },
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'bb',
      },
    ])
  }
  expect(validateA).toBeCalledTimes(1)
  expect(validateB).toBeCalledTimes(1)
  expect(aa.invalid).toBeTruthy()
  expect(bb.invalid).toBeTruthy()
  expect(validator).toBeCalledTimes(2)
  aa.editable = false
  try {
    await form.validate()
  } catch (e) {
    expect(e).toEqual([
      {
        triggerType: 'onInput',
        type: 'error',
        code: 'ValidateError',
        messages: ['error'],
        path: 'bb',
      },
    ])
  }
  expect(validateA).toBeCalledTimes(1)
  expect(validateB).toBeCalledTimes(2)
  expect(aa.invalid).toBeFalsy()
  expect(bb.invalid).toBeTruthy()
  expect(validator).toBeCalledTimes(3)
  bb.editable = false
  await form.validate()
  expect(validateA).toBeCalledTimes(1)
  expect(validateB).toBeCalledTimes(2)
  expect(aa.invalid).toBeFalsy()
  expect(bb.invalid).toBeFalsy()
  expect(validator).toBeCalledTimes(3)
})

test('validator order with format', async () => {
  const form = attach(createForm())

  attach(
    form.createField({
      name: 'aa',
      required: true,
      validator: {
        format: 'url',
        message: 'custom',
      },
    })!
  )

  attach(
    form.createField({
      name: 'bb',
      required: true,
      validator: (value) => {
        if (!value) return ''
        return value !== '111' ? 'custom' : ''
      },
    })!
  )
  const results = await form.submit<any[]>(() => {}).catch((e) => e)
  expect(results.map(({ messages }: any) => messages)).toEqual([
    ['The field value is required'],
    ['The field value is required'],
  ])
})

test('form unmount can not effect field values', () => {
  const form = attach(
    createForm({
      values: {
        aa: '123',
      },
    })
  )
  attach(
    form.createField({
      name: 'aa',
    })!
  )
  expect(form.values.aa).toEqual('123')
  form.onUnmount()
  expect(form.values.aa).toEqual('123')
})

test('form clearFormGraph need clear field values', () => {
  const form = attach(
    createForm({
      values: {
        aa: '123',
      },
    })
  )
  attach(
    form.createField({
      name: 'aa',
    })!
  )
  expect(form.values.aa).toEqual('123')
})

test('form clearFormGraph not clear field values', () => {
  const form = attach(
    createForm({
      values: {
        aa: '123',
      },
    })
  )
  attach(
    form.createField({
      name: 'aa',
    })!
  )
  expect(form.values.aa).toEqual('123')
})

test('form values auto clean with visible false', () => {
  const form = attach(
    createForm({
      initialValues: {
        aa: '123',
        bb: '321',
        cc: 'cc',
      },
    })
  )
  attach(
    form.createField({
      name: 'aa',
    })!
  )
  attach(
    form.createField({
      name: 'bb',
      reactions: (field) => {
        field.visible = form.values.aa === '1233'
      },
    })!
  )
  attach(
    form.createField({
      name: 'cc',
    })!
  )

  expect(form.values).toEqual({
    aa: '123',
    cc: 'cc',
  })
})

test('form values auto clean with visible false in async setInitialValues', () => {
  const form = attach(createForm())
  attach(
    form.createField({
      name: 'aa',
    })!
  )
  attach(
    form.createField({
      name: 'bb',
      reactions: (field) => {
        field.visible = form.values.aa === '1233'
      },
    })!
  )
  attach(
    form.createField({
      name: 'cc',
    })!
  )

  form.setValues({
    aa: '123',
    bb: '321',
    cc: 'cc',
  })

  expect(form.values).toEqual({
    aa: '123',
    cc: 'cc',
  })
})

test('form values ref should not changed with setValues', () => {
  const form = attach(
    createForm({
      values: {
        aa: '123',
      },
    })
  )
  const { values } = form
  form.setValues({
    bb: '321',
  })
  expect(form.values === values).toBeTruthy()
})

test('form initial values ref should not changed with setInitialValues', () => {
  const form = attach(
    createForm({
      initialValues: {
        aa: '123',
      },
    })
  )
  const values = form.initialValues
  form.setInitialValues({
    bb: '321',
  })
  expect(form.initialValues === values).toBeTruthy()
})
