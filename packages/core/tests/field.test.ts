/* eslint-disable no-param-reassign */
// import { createForm } from '@astro-form/core'
import { autorun } from 'mobx'

import { createForm } from '../src/index'

import { attach, sleep } from './shared'

test('create field', () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'normal',
    })!
  )
  expect(field).not.toBeUndefined()
})

test('create field props', () => {
  const form = attach(createForm())
  const field1 = attach(
    form.createField({
      name: 'field1',
      required: true,
    })!
  )
  expect(field1.required).toBeTruthy()
  expect(field1.validator).not.toBeUndefined()
  const field2 = attach(
    form.createField({
      name: 'field2',
      disabled: true,
      hidden: true,
    })!
  )
  expect(field2.pattern).toEqual('disabled')
  expect(field2.disabled).toBeTruthy()
  expect(field2.display).toEqual('hidden')
  expect(field2.hidden).toBeTruthy()
  const field3 = attach(
    form.createField({
      name: 'field3',
      readPretty: true,
      visible: false,
    })!
  )
  expect(field3.pattern).toEqual('readPretty')
  expect(field3.display).toEqual('none')
  expect(field3.visible).toBeFalsy()
  const field4 = attach(
    form.createField({
      name: 'field4',
      value: 123,
    })!
  )
  expect(field4.value).toEqual(123)
  expect(field4.initialValue).toBeUndefined()
  const field5 = attach(
    form.createField({
      name: 'field5',
      initialValue: 234,
    })!
  )
  expect(field5.value).toEqual(234)
  expect(field5.initialValue).toEqual(234)
})

test('field display and value', () => {
  const form = attach(createForm())
  const objectField = attach(
    form.createObjectField({
      name: 'object',
    })!
  )
  const arrayField = attach(
    form.createArrayField({
      name: 'array',
    })!
  )
  const valueField = attach(
    form.createField({
      name: 'value',
    })!
  )
  expect(objectField.value).toEqual({})
  expect(arrayField.value).toEqual([])
  expect(valueField.value).toBeUndefined()

  objectField.hidden = true
  arrayField.hidden = true
  valueField.hidden = true
  expect(objectField.value).toEqual({})
  expect(arrayField.value).toEqual([])
  expect(valueField.value).toBeUndefined()

  objectField.hidden = false
  arrayField.hidden = false
  valueField.hidden = false
  expect(objectField.value).toEqual({})
  expect(arrayField.value).toEqual([])
  expect(valueField.value).toBeUndefined()

  objectField.visible = false
  arrayField.visible = false
  valueField.visible = false
  expect(objectField.value).toBeUndefined()
  expect(arrayField.value).toBeUndefined()
  expect(valueField.value).toBeUndefined()

  objectField.visible = true
  arrayField.visible = true
  valueField.visible = true
  expect(objectField.value).toEqual({})
  expect(arrayField.value).toEqual([])
  expect(valueField.value).toBeUndefined()

  objectField.value = { value: '123' }
  arrayField.value = ['123']
  valueField.value = '123'
  expect(objectField.value).toEqual({ value: '123' })
  expect(arrayField.value).toEqual(['123'])
  expect(valueField.value).toEqual('123')

  objectField.hidden = true
  arrayField.hidden = true
  valueField.hidden = true
  expect(objectField.value).toEqual({ value: '123' })
  expect(arrayField.value).toEqual(['123'])
  expect(valueField.value).toEqual('123')

  objectField.hidden = false
  arrayField.hidden = false
  valueField.hidden = false
  expect(objectField.value).toEqual({ value: '123' })
  expect(arrayField.value).toEqual(['123'])
  expect(valueField.value).toEqual('123')

  objectField.visible = false
  arrayField.visible = false
  valueField.visible = false
  expect(objectField.value).toBeUndefined()
  expect(arrayField.value).toBeUndefined()
  expect(valueField.value).toBeUndefined()

  objectField.visible = true
  arrayField.visible = true
  valueField.visible = true
  expect(objectField.value).toEqual({})
  expect(arrayField.value).toEqual([])
  expect(valueField.value).toBeUndefined()
})

test('nested display/pattern', () => {
  const form = attach(createForm())
  const object_ = attach(
    form.createObjectField({
      name: 'object',
    })!
  )
  const aaa = attach(
    form.createField({
      name: 'aaa',
      basePath: 'object.void',
    })!
  )
  const bbb = attach(
    form.createField({
      name: 'bbb',
      basePath: 'object',
    })!
  )
  const ddd = attach(
    form.createField({
      name: 'ddd',
    })!
  )
  const eee = attach(
    form.createField({
      name: 'eee',
      basePath: 'object.void',
      readPretty: true,
      hidden: true,
    })!
  )
  expect(ddd.visible).toBeTruthy()
  expect(ddd.editable).toBeTruthy()
  object_.setPattern('readPretty')
  expect(aaa.pattern).toEqual('readPretty')
  expect(bbb.pattern).toEqual('readPretty')
  expect(eee.pattern).toEqual('readPretty')
  object_.setPattern('disabled')
  expect(aaa.pattern).toEqual('disabled')
  expect(bbb.pattern).toEqual('disabled')
  expect(eee.pattern).toEqual('disabled')
  object_.setPattern('editable')
  expect(aaa.pattern).toEqual('editable')
  expect(bbb.pattern).toEqual('editable')
  expect(eee.pattern).toEqual('readPretty')

  object_.setDisplay('hidden')
  expect(aaa.display).toEqual('hidden')
  expect(bbb.display).toEqual('hidden')
  expect(eee.display).toEqual('hidden')
  object_.setDisplay('none')
  expect(aaa.display).toEqual('none')
  expect(bbb.display).toEqual('none')
  expect(eee.display).toEqual('none')
  object_.setDisplay('visible')
  expect(aaa.display).toEqual('visible')
  expect(bbb.display).toEqual('visible')
  expect(eee.display).toEqual('hidden')

  aaa.setValue('123')
  expect(aaa.value).toEqual('123')
  aaa.setDisplay('none')
  expect(aaa.value).toBeUndefined()
  aaa.setDisplay('visible')
  expect(aaa.value).toBeUndefined()
  aaa.setValue('123')
  object_.setDisplay('none')
  expect(aaa.value).toBeUndefined()
  object_.setDisplay('visible')
  expect(aaa.value).toBeUndefined()
})

test('setValue/setInitialValue', () => {
  const form = attach(createForm())
  const aaa = attach(
    form.createField({
      name: 'aaa',
    })!
  )
  const bbb = attach(
    form.createField({
      name: 'bbb',
    })!
  )
  aaa.setValue('123')
  expect(aaa.value).toEqual('123')
  expect(form.values.aaa).toEqual('123')
  bbb.setValue('123')
  expect(bbb.value).toEqual('123')
  expect(form.values.bbb).toEqual('123')
  const ccc = attach(
    form.createField({
      name: 'ccc',
    })!
  )
  ccc.setInitialValue('123')
  expect(ccc.value).toEqual('123')
  expect(ccc.initialValue).toEqual('123')
  expect(form.values.ccc).toEqual('123')
  ccc.setInitialValue('222')
  expect(ccc.value).toEqual('123')
  expect(ccc.initialValue).toEqual('222')
  expect(form.values.ccc).toEqual('123')
})

test('setLoading/setValidating', async () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'aa',
    })!
  )
  field.setLoading(true)
  expect(field.loading).toBeTruthy()
  field.setLoading(false)
  expect(field.loading).toBeFalsy()
  field.setValidating(true)
  expect(field.validating).toBeTruthy()
  field.setValidating(false)
  expect(field.validating).toBeFalsy()
})

test('setComponent/setComponentProps', () => {
  const component = () => null
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'aa',
    })!
  )

  field.setComponent(undefined, { props: 123 })
  field.setComponent(component)
  expect(field.component[0]).toEqual(component)
  expect(field.component[1]).toEqual({ props: 123 })
  field.setComponentProps({
    hello: 'world',
  })
  expect(field.component[1]).toEqual({ props: 123, hello: 'world' })
})

test('reaction initialValue', () => {
  const form = attach(
    createForm({
      values: {
        aa: 123,
      },
    })
  )
  const aa = attach(
    form.createField({
      name: 'aa',
      reactions(field) {
        field.initialValue = 321
      },
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      value: 123,
      reactions(field) {
        field.initialValue = 321
      },
    })!
  )
  expect(aa.value).toEqual(123)
  expect(bb.value).toEqual(123)
  expect(aa.initialValue).toEqual(321)
  expect(bb.initialValue).toEqual(321)
})

test('selfValidate/errors/warnings/successes/valid/invalid/validateStatus/queryFeedbacks', async () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'aa',
      required: true,
      validateFirst: true,
      validator: [
        (value) => {
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
          return null
        },
        {
          triggerType: 'onBlur',
          format: 'url',
        },
        {
          triggerType: 'onFocus',
          format: 'date',
        },
      ],
    })!
  )
  const field2 = attach(
    form.createField({
      name: 'bb',
      required: true,
      value: '111',
      validator: [
        (value) => {
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
          return null
        },
        {
          triggerType: 'onBlur',
          format: 'url',
        },
        {
          triggerType: 'onFocus',
          format: 'date',
        },
      ],
    })!
  )
  const field3 = attach(
    form.createField({
      name: 'xxx',
    })!
  )
  const field4 = attach(
    form.createField({
      name: 'ppp',
      required: true,
    })!
  )
  try {
    await field.validate()
  } catch {}
  try {
    await field2.validate()
  } catch {}
  expect(field.invalid).toBeTruthy()
  expect(field.selfErrors.length).toEqual(1)
  expect(field2.invalid).toBeTruthy()
  expect(field2.selfErrors.length).toEqual(3)
  await field.onInput('123')
  expect(field.selfSuccesses).toEqual(['success'])
  await field.onInput('321')
  expect(field.selfWarnings).toEqual(['warning'])
  await field.onInput('111')
  expect(field.selfErrors).toEqual(['error'])
  await field.onBlur()
  expect(field.selfErrors).toEqual(['error', 'The field value is a invalid url'])
  await field.onFocus()
  expect(field.selfErrors).toEqual([
    'error',
    'The field value is a invalid url',
    'The field value is not a valid date format',
  ])
  expect(field3.feedbacks).toEqual([])
  field3.setFeedback({ messages: ['error'], code: 'EffectError', type: 'error' })
  field3.setFeedback({ messages: ['error2'], code: 'EffectError', type: 'error' })
  expect(field3.feedbacks).toEqual([{ code: 'EffectError', messages: ['error2'], type: 'error' }])
  expect(
    field3.queryFeedbacks({
      path: 'xxx',
    })
  ).toEqual([{ code: 'EffectError', messages: ['error2'], type: 'error' }])
  expect(
    field3.queryFeedbacks({
      path: 'yyy',
    })
  ).toEqual([])
  expect(
    field3.queryFeedbacks({
      path: 'yyy',
    })
  ).toEqual([])
  field3.setFeedback({ messages: [], code: 'EffectError', type: 'error' })
  field4.setDisplay('none')
  await field4.validate()
  expect(field4.selfErrors).toEqual([])
})

test('setValidateRule', () => {
  const form = attach(createForm())
  const field1 = attach(
    form.createField({
      name: 'aa',
      validator: [{ required: true }],
    })!
  )
  const field2 = attach(
    form.createField({
      name: 'bb',
      validator: 'phone',
    })!
  )
  const field3 = attach(
    form.createField({
      name: 'cc',
      validator: 'phone',
    })!
  )
  const field4 = attach(
    form.createField({
      name: 'dd',
      validator: { format: 'phone' },
    })!
  )
  const field5 = attach(
    form.createField({
      name: 'ee',
      validator: [{ format: 'phone' }],
    })!
  )
  const field6 = attach(
    form.createField({
      name: 'ff',
    })!
  )
  field1.setValidatorRule('format', 'phone')
  field2.setValidatorRule('max', 3)
  field3.setValidatorRule('format', 'url')
  field4.setValidatorRule('min', 3)
  field5.setValidatorRule('min', 3)
  field6.setValidatorRule('min', 3)
  expect(field1.validator).toEqual([{ required: true }, { format: 'phone' }])
  expect(field2.validator).toEqual([{ format: 'phone' }, { max: 3 }])
  expect(field3.validator).toEqual([{ format: 'url' }])
  expect(field4.validator).toEqual([{ format: 'phone' }, { min: 3 }])
  expect(field5.validator).toEqual([{ format: 'phone' }, { min: 3 }])
  expect(field6.validator).toEqual([{ min: 3 }])
})

test('query', () => {
  const form = attach(createForm())
  const object_ = attach(
    form.createObjectField({
      name: 'object',
    })!
  )
  const aaa = attach(
    form.createField({
      name: 'aaa',
      basePath: 'object.void',
    })!
  )
  const bbb = attach(
    form.createField({
      name: 'bbb',
      basePath: 'object',
    })!
  )
  expect(object_.query('object.void').take()).toBeUndefined()
  expect(object_.query('object.void.aaa').take()).not.toBeUndefined()
  expect(aaa.query('.ccc').take()).toBeUndefined()
  expect(aaa.query('..').take()).not.toBeUndefined()
  expect(aaa.query('..bbb').take()).not.toBeUndefined()
  expect(bbb.query('.void').take()).toBeUndefined()
  expect(bbb.query('.void.aaa').take()).not.toBeUndefined()
  expect(bbb.query('.void.ccc').take()).toBeUndefined()
})

test('empty initialValue', () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
      initialValue: '',
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
    })!
  )
  expect(aa.value).toEqual('')
  expect(form.values.aa).toEqual('')
  expect(bb.value).toEqual(undefined)
  expect(form.values.bb).toEqual(undefined)
})

test('objectFieldWithInitialValue', async () => {
  const form = attach(
    createForm({
      initialValues: {
        obj: {
          a: 'a',
        },
      },
    })
  )
  attach(
    form.createObjectField({
      name: 'obj',
    })!
  )
  const fieldObjA = attach(
    form.createField({
      name: 'obj.a',
    })!
  )

  expect(fieldObjA.initialValue).toEqual('a')
  fieldObjA.value = 'aa'
  expect(fieldObjA.value).toEqual('aa')
  expect(fieldObjA.initialValue).toEqual('a')
})

test('initialValueWithArray', () => {
  const form = attach(createForm())
  const field = attach(
    form.createArrayField({
      name: 'aaa',
      initialValue: [1, 2],
    })!
  )
  expect(field.initialValue).toEqual([1, 2])
  expect(field.value).toEqual([1, 2])
  expect(form.initialValues.aaa).toEqual([1, 2])
  expect(form.values.aaa).toEqual([1, 2])
})

test('resetObjectFieldWithInitialValue', async () => {
  const form = attach(createForm())
  attach(
    form.createObjectField({
      name: 'obj',
    })!
  )
  const fieldObjA = attach(
    form.createField({
      name: 'obj.test.a',
      initialValue: 'a',
    })!
  )

  fieldObjA.value = 'aa'
  expect(fieldObjA.value).toEqual('aa')
  expect(form.values).toEqual({ obj: { test: { a: 'aa' } } })
  await form.reset()
  expect(fieldObjA.value).toEqual('a')

  fieldObjA.value = 'aa'
  expect(fieldObjA.value).toEqual('aa')
  await form.reset()
  expect(fieldObjA.initialValue).toEqual('a')
  expect(fieldObjA.value).toEqual('a')
})

test('reset', async () => {
  const form = attach(
    createForm<any>({
      values: {
        bb: 123,
      },
      initialValues: {
        aa: 123,
        cc: null,
      },
    })
  )
  const aa = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      required: true,
    })!
  )
  const cc = attach(
    form.createField({
      name: 'cc',
      required: true,
    })!
  )
  const dd = attach(
    form.createField({
      name: 'dd',
      required: true,
    })!
  )
  expect(aa.value).toEqual(123)
  expect(bb.value).toEqual(123)
  expect(cc.value).toEqual(null)
  expect(form.values.aa).toEqual(123)
  expect(form.values.bb).toEqual(123)
  expect(form.values.cc).toEqual(null)
  aa.onInput('xxxxx')
  expect(form.values.aa).toEqual('xxxxx')
  dd.onInput(null)
  expect(form.values.dd).toEqual(null)
  aa.reset()
  expect(aa.value).toEqual(123)
  expect(form.values.aa).toEqual(123)
  bb.onInput('xxxxx')
  expect(form.values.bb).toEqual('xxxxx')
  bb.reset()
  expect(bb.value).toBeUndefined()
  expect(form.values.bb).toBeUndefined()

  cc.onInput('xxxxx')
  expect(form.values.cc).toEqual('xxxxx')
  cc.reset()
  expect(cc.value).toBeNull()
  expect(form.values.cc).toBeNull()
  dd.reset()
  expect(dd.value).toBeUndefined()
  expect(form.values.dd).toBeUndefined()

  aa.reset({ forceClear: true })
  expect(aa.value).toBeUndefined()
  expect(form.values.aa).toBeUndefined()
  cc.reset({ forceClear: true })
  expect(cc.value).toBeUndefined()
  expect(form.values.cc).toBeUndefined()

  expect(aa.valid).toBeTruthy()
  await aa.reset({ forceClear: true, validate: true })
  expect(aa.valid).toBeFalsy()

  expect(cc.valid).toBeTruthy()
  await cc.reset({ forceClear: true, validate: true })
  expect(cc.valid).toBeFalsy()
})

test('match', () => {
  const form = attach(
    createForm<any>({
      values: {
        bb: 123,
      },
      initialValues: {
        aa: 123,
      },
    })
  )
  const aa = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  expect(aa.match('aa')).toBeTruthy()
  expect(aa.match('*')).toBeTruthy()
  expect(aa.match('a~')).toBeTruthy()
  expect(aa.match('*(aa,bb)')).toBeTruthy()
})

test('setDataSource', () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  aa.setDataSource([
    { label: 's1', value: 's1' },
    { label: 's2', value: 's2' },
  ])
  expect(aa.dataSource).toEqual([
    { label: 's1', value: 's1' },
    { label: 's2', value: 's2' },
  ])
})

test('required/setRequired', () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
    })!
  )
  aa.setRequired(true)
  expect(aa.required).toBeTruthy()
  aa.setRequired(false)
  expect(aa.required).toBeFalsy()
  const bb = attach(
    form.createField({
      name: 'bb',
      validator: {
        max: 3,
        required: true,
      },
    })!
  )
  expect(bb.required).toBeTruthy()
  bb.setRequired(false)
  expect(bb.required).toBeFalsy()
  const cc = attach(
    form.createField({
      name: 'cc',
      validator: [
        'date',
        {
          max: 3,
        },
        {
          required: true,
        },
      ],
    })!
  )
  expect(cc.required).toBeTruthy()
  cc.setRequired(false)
  expect(cc.required).toBeFalsy()
  const dd = attach(
    form.createField({
      name: 'dd',
      validator: {
        max: 3,
      },
    })!
  )
  expect(dd.required).toBeFalsy()
  dd.setRequired(true)
  expect(dd.required).toBeTruthy()
})

test('setData', () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
      required: true,
    })!
  )
  aa.setData('This is data')
  expect(aa.data).toEqual('This is data')
})

test('setErrors/setWarnings/setSuccesses/setValidator', async () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
    })!
  )
  const cc = attach(
    form.createField({
      name: 'cc',
    })!
  )
  const dd = attach(
    form.createField({
      name: 'dd',
      validator() {
        return new Promise(() => {})
      },
    })!
  )
  aa.setSelfErrors(['error'])
  aa.setSelfWarnings(['warning'])
  aa.setSelfSuccesses(['success'])
  bb.setSelfSuccesses(['success'])
  cc.setSelfWarnings(['warning'])
  expect(aa.selfErrors).toEqual(['error'])
  expect(aa.valid).toBeFalsy()
  expect(aa.selfWarnings).toEqual(['warning'])
  expect(aa.selfSuccesses).toEqual(['success'])
  expect(bb.validateStatus).toEqual('success')
  expect(cc.validateStatus).toEqual('warning')
  aa.setValidator('date')
  await aa.onInput('123')
  expect(aa.selfErrors.length).toEqual(2)
  dd.onInput('123')
  await sleep()
  expect(dd.validateStatus).toEqual('validating')
})

test('reactions', async () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      reactions: [
        (field) => {
          const _aa = field.query('aa').take()!
          if (_aa.value === '123') {
            field.visible = false
          } else {
            field.visible = true
          }
          if (_aa.inputValue === '333') {
            field.editable = false
          } else if (_aa.inputValue === '444') {
            field.editable = true
          }
          if (_aa.initialValue === '555') {
            field.readPretty = true
          } else if (_aa.initialValue === '666') {
            field.readPretty = false
          }
        },
      ],
    })!
  )
  expect(bb.visible).toBeTruthy()
  aa.setValue('123')
  expect(bb.visible).toBeFalsy()
  await aa.onInput('333')
  expect(bb.editable).toBeFalsy()
  await aa.onInput('444')
  expect(bb.editable).toBeTruthy()
  aa.setInitialValue('555')
  expect(bb.readPretty).toBeTruthy()
  aa.setInitialValue('666')
  expect(bb.readPretty).toBeFalsy()
  form.onUnmount()
})

test('fault intolerance', () => {
  // display == 'none' 设置 value 无效
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'aa',
      value: 123,
    })!
  )
  field.setDisplay('none')
  expect(field.value).toBeUndefined()
  field.setDisplay('visible')
  expect(field.value).toBeUndefined()
  field.setDisplay('none')
  expect(field.value).toBeUndefined()
  field.setValue(321)
  expect(field.value).toBeUndefined()
  field.setDisplay('visible')
  expect(field.value).toBeUndefined()
  const field2 = attach(
    form.createField({
      name: 'xxx',
    })!
  )
  expect(field2.display).toEqual('visible')
  expect(field2.pattern).toEqual('editable')
})

test('initialValue', () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'aaa',
      initialValue: 123,
    })!
  )
  expect(form.values.aaa).toEqual(123)
  expect(form.initialValues.aaa).toEqual(123)
  expect(field.value).toEqual(123)
  expect(field.initialValue).toEqual(123)
})

test('array path calculation with none index', async () => {
  const form = attach(createForm())
  attach(
    form.createArrayField({
      name: 'array',
    })!
  )
  const input = attach(
    form.createField({
      name: '0.input',
      basePath: 'array',
    })!
  )
  expect(input.path.toString()).toEqual('array.0.input')
  input.value = 123
  expect(form.values).toEqual({ array: [{ input: 123 }] })
})

test('array path calculation with object index', async () => {
  const form = attach(createForm())
  attach(
    form.createArrayField({
      name: 'array',
    })!
  )
  attach(
    form.createObjectField({
      name: '0',
      basePath: 'array',
    })!
  )
  const input = attach(
    form.createField({
      name: 'input',
      basePath: 'array.0',
    })!
  )
  expect(input.path.toString()).toEqual('array.0.input')
})

test('reaction in reaction', () => {
  const form = attach(createForm())
  const obj = attach(
    form.createField({
      name: 'obj',
      initialValue: 123,
    })!
  )
  attach(
    form.createField({
      name: 'field1',
      basePath: 'obj',
      initialValue: 123,
    })!
  )
  const field2 = attach(
    form.createField({
      name: 'field2',
      basePath: 'obj',
      initialValue: 456,
      reactions: (field) => {
        const f1 = field.query('.field1').take()!
        if (f1.value === 123) {
          field.display = 'visible'
        } else {
          field.display = 'none'
        }
      },
    })!
  )
  obj.visible = false
  expect(field2.value).toEqual(undefined)
  expect(field2.display).toEqual('none')
})

test('nested fields hidden and selfValidate', async () => {
  const form = attach(createForm())
  const parent = attach(
    form.createField({
      name: 'parent',
    })!
  )
  attach(
    form.createField({
      name: 'aa',
      basePath: 'parent',
      required: true,
    })!
  )
  attach(
    form.createField({
      name: 'bb',
      basePath: 'parent',
      required: true,
    })!
  )
  try {
    await form.validate()
  } catch {}
  expect(form.invalid).toBeTruthy()
  parent.display = 'hidden'
  await form.validate()
  expect(form.invalid).toBeFalsy()
})

test('deep nested fields hidden and selfValidate', async () => {
  const form = attach(createForm())
  const parent1 = attach(
    form.createField({
      name: 'parent1',
    })!
  )
  const parent2 = attach(
    form.createField({
      name: 'parent2',
      basePath: 'parent1',
    })!
  )
  const aa = attach(
    form.createField({
      name: 'aa',
      basePath: 'parent1.parent2',
      required: true,
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      basePath: 'parent1.parent2',
      required: true,
    })!
  )
  try {
    await form.validate()
  } catch {}
  expect(form.invalid).toBeTruthy()
  parent2.display = 'visible'
  parent1.display = 'hidden'
  expect(parent2.display).toEqual('hidden')
  expect(aa.display).toEqual('hidden')
  expect(bb.display).toEqual('hidden')
  await form.validate()
  expect(form.invalid).toBeFalsy()
})

test('deep nested fields hidden and selfValidate with middle hidden', async () => {
  const form = attach(createForm())
  const parent1 = attach(
    form.createField({
      name: 'parent1',
    })!
  )
  const parent2 = attach(
    form.createField({
      name: 'parent2',
      basePath: 'parent1',
    })!
  )
  const aa = attach(
    form.createField({
      name: 'aa',
      basePath: 'parent1.parent2',
      required: true,
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      basePath: 'parent1.parent2',
      required: true,
    })!
  )
  try {
    await form.validate()
  } catch {}
  expect(form.invalid).toBeTruthy()
  parent2.display = 'hidden'
  parent1.display = 'none'
  expect(parent2.display).toEqual('none')
  expect(aa.display).toEqual('none')
  expect(bb.display).toEqual('none')
  await form.validate()
  expect(form.invalid).toBeFalsy()
})

test('fields unmount and selfValidate', async () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'parent',
      required: true,
    })!
  )
  try {
    await form.validate()
  } catch {}
  expect(form.invalid).toBeTruthy()
  field.onUnmount()
  try {
    await form.validate()
  } catch {}
  expect(form.invalid).toBeTruthy()
  field.destroy()
  await form.validate()
  expect(form.invalid).toBeFalsy()
})

test('initial value with empty', () => {
  const form = attach(createForm())
  const array = attach(form.createField({ name: 'array', initialValue: '' })!)
  expect(array.value).toEqual('')

  const beNull = attach(form.createField({ name: 'null', initialValue: null })!)
  expect(beNull.value).toEqual(null)
})

test('field submit', async () => {
  const form = attach(
    createForm({
      initialValues: {
        aa: {
          cc: 'cc',
        },
        bb: 'bb',
      },
    })
  )
  const childForm = attach(
    form.createObjectField({
      name: 'aa',
    })!
  )
  attach(
    form.createField({
      name: 'bb',
    })!
  )
  attach(
    form.createField({
      name: 'cc',
      basePath: 'aa',
    })!
  )
  const onSubmit = jest.fn()
  await childForm.submit(onSubmit)
  expect(onSubmit).toBeCalledWith({
    cc: 'cc',
  })
})

test('field submit with error', async () => {
  const form = attach(createForm())
  const childForm = attach(
    form.createObjectField({
      name: 'aa',
    })!
  )
  attach(
    form.createField({
      name: 'bb',
      required: true,
    })!
  )
  attach(
    form.createField({
      name: 'cc',
      basePath: 'aa',
      required: true,
    })!
  )
  const onSubmit = jest.fn()
  try {
    await childForm.submit(onSubmit)
  } catch (e) {
    expect(e).not.toBeUndefined()
  }
  expect(onSubmit).toBeCalledTimes(0)
})

test('initial display with value', () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
      value: 123,
      visible: false,
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      value: 123,
      visible: true,
    })!
  )
  const cc = attach(
    form.createField({
      name: 'cc',
      value: 123,
      hidden: true,
    })!
  )
  expect(aa.value).toBeUndefined()
  expect(aa.visible).toBeFalsy()
  expect(bb.value).toEqual(123)
  expect(bb.visible).toBeTruthy()
  expect(cc.value).toEqual(123)
  expect(cc.hidden).toBeTruthy()
})

test('state depend field visible value', async () => {
  const form = attach(createForm())
  const aa = attach(
    form.createField({
      name: 'aa',
    })!
  )
  const bb = attach(
    form.createField({
      name: 'bb',
      reactions(field) {
        field.visible = aa.value === '123'
      },
    })!
  )
  const cc = attach(
    form.createField({
      name: 'cc',
      reactions(field) {
        field.visible = aa.value === '123'
        field.disabled = !bb.value
      },
    })!
  )
  expect(bb.visible).toBeFalsy()
  expect(cc.visible).toBeFalsy()
  expect(cc.disabled).toBeTruthy()
  aa.value = '123'
  expect(bb.visible).toBeTruthy()
  expect(cc.visible).toBeTruthy()
  expect(cc.disabled).toBeTruthy()
  bb.value = '321'
  expect(bb.visible).toBeTruthy()
  expect(cc.visible).toBeTruthy()
  expect(cc.disabled).toBeFalsy()
  aa.value = ''
  expect(bb.visible).toBeFalsy()
  expect(cc.visible).toBeFalsy()
  expect(cc.disabled).toBeTruthy()
  aa.value = '123'
  expect(bb.visible).toBeTruthy()
  expect(cc.visible).toBeTruthy()
  expect(cc.disabled).toBeTruthy()
})

test('reactions initialValue and value', () => {
  const form = attach(
    createForm({
      values: {
        aa: {
          input: '111',
        },
      },
    })
  )
  attach(
    form.createObjectField({
      name: 'aa',
      reactions: [
        (field) => {
          field.initialValue = {}
          field.initialValue.input = 123
        },
      ],
    })!
  )
  attach(
    form.createField({
      name: 'input',
      basePath: 'aa',
    })!
  )
  expect(form.values.aa.input).toEqual('111')
})

test('field name is length in initialize', () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'length',
      initialValue: 123,
    })!
  )
  expect(field.value).toEqual(123)
})

test('field name is length in dynamic assign', async () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'length',
    })!
  )
  field.initialValue = 123
  expect(field.value).toEqual(123)
})

test('nested field modified', async () => {
  const form = attach(createForm())
  const obj = attach(
    form.createObjectField({
      name: 'object',
    })!
  )
  const child = attach(
    form.createField({
      name: 'child',
      basePath: 'object',
    })!
  )
  await child.onInput()
  expect(child.modified).toBeTruthy()
  expect(child.selfModified).toBeTruthy()
  expect(obj.modified).toBeTruthy()
  expect(obj.selfModified).toBeFalsy()
  expect(form.modified).toBeTruthy()
  await obj.reset()
  expect(child.modified).toBeFalsy()
  expect(child.selfModified).toBeFalsy()
  expect(obj.modified).toBeFalsy()
  expect(obj.selfModified).toBeFalsy()
  expect(form.modified).toBeTruthy()
  await form.reset()
  expect(form.modified).toBeFalsy()
})

test('field setValidator repeat call', async () => {
  const form = attach(createForm())
  const field = attach(
    form.createField({
      name: 'normal',
    })!
  )

  const validator1 = jest.fn(() => '')
  const validator2 = jest.fn(() => '')
  const validator3 = jest.fn(() => '')

  field.setValidator([validator1, validator2, validator3])

  await form.validate()
  expect(validator1).toBeCalledTimes(1)
})

test('custom validator to get ctx.field', async () => {
  const form = attach(createForm())
  let ctxField = null
  let ctxForm = null
  attach(
    form.createField({
      name: 'aaa',
      validator(value, rule, ctx) {
        ctxField = ctx.field
        ctxForm = ctx.form
        return ''
      },
    })!
  )
  await form.submit()
  expect(!!ctxField).toBeTruthy()
  expect(!!ctxForm).toBeTruthy()
})

// test('single direction linkage effect', async () => {
//   const form = attach(createForm())

//   const input2 = form.createField({
//     name: 'input2',
//   })!

//   const input1 = form.createField({
//     name: 'input1',
//     reactions: (field) => {
//       // selfModified 明明是 observable 为什么不重新触发？ 需要调试
//       if (!field.selfModified) {
//         return
//       }
//       input2.value = field.value
//     },
//   })!

//   await input1.onInput('123')
//   expect(input2.value).toBe('123')
//   await input2.onInput('321')
//   expect(input2.value).toBe('321')
// })

test('path change will update computed value', () => {
  const form = attach(createForm())

  const input = form.createField({
    name: 'input',
  })!

  const value = jest.fn()

  autorun(() => {
    value(input.value)
  })
  input.value = '123'
  expect(value).nthCalledWith(2, '123')
})

test('object field reset', async () => {
  const form = attach(createForm())

  attach(
    form.createObjectField({
      name: 'obj',
    })!
  )

  const input = attach(
    form.createField({
      name: 'input',
      basePath: 'obj',
    })!
  )

  await form.reset()
  form.setValues({
    obj: {
      input: '123',
    },
  })
  expect(input.value).toBe('123')
})
