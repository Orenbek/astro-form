import { describe, expect, test } from '@rstest/core'
import { extractFieldPropsAndComponentProps, normalizeDirectiveKey } from '../src/utils/extract-field-props'
import { shallowEqualRecord } from '../src/utils/shallow-equal'
import { ValueType } from '../src/types'

describe('shallowEqualRecord', () => {
  test('compares key identity with Object.is', () => {
    const fn = () => {}
    expect(shallowEqualRecord({ a: 1, b: fn }, { a: 1, b: fn })).toBe(true)
    expect(shallowEqualRecord({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(shallowEqualRecord({ a: 1 }, { a: 2 })).toBe(false)
    expect(shallowEqualRecord({ a: NaN }, { a: NaN })).toBe(true)
  })
})

describe('normalizeDirectiveKey', () => {
  test('keeps camelCase suffix', () => {
    expect(normalizeDirectiveKey('initialValue')).toBe('initialValue')
    expect(normalizeDirectiveKey('maxLength')).toBe('maxLength')
  })

  test('camelCases kebab-case suffix', () => {
    expect(normalizeDirectiveKey('initial-value')).toBe('initialValue')
    expect(normalizeDirectiveKey('max-length')).toBe('maxLength')
    expect(normalizeDirectiveKey('read-pretty')).toBe('readPretty')
  })
})

describe('extractFieldPropsAndComponentProps', () => {
  const base = {
    name: 'email',
    as: 'input',
    $$valueType: ValueType.String,
  }

  test('keeps $$ / v$$ compiler contract at runtime', () => {
    const [field, component, validator] = extractFieldPropsAndComponentProps({
      ...base,
      $$required: true,
      $$initialValue: '',
      v$$maxLength: 32,
      v$$required: true,
      placeholder: 'email',
      type: 'text',
    })

    expect(field.name).toBe('email')
    expect(field.as).toBe('input')
    expect(field.$$valueType).toBe(ValueType.String)
    expect(field.required).toBe(true)
    expect(field.initialValue).toBe('')
    expect(validator.maxLength).toBe(32)
    expect((validator as any).required).toBe(true)
    expect(component.placeholder).toBe('email')
    expect(component.type).toBe('text')
  })

  test('x-* → field only; v-* → validators only', () => {
    const [field, component, validator] = extractFieldPropsAndComponentProps({
      ...base,
      'x-required': true,
      'x-initialValue': 'a@b.com',
      'x-display': 'visible',
      'x-pattern': 'editable',
      'v-maxLength': 64,
      'v-format': 'email',
      className: 'input',
    })

    expect(field.required).toBe(true)
    expect(field.initialValue).toBe('a@b.com')
    expect(field.display).toBe('visible')
    expect(field.pattern).toBe('editable')
    expect(validator.maxLength).toBe(64)
    expect(validator.format).toBe('email')
    expect((validator as any).required).toBeUndefined()
    expect(component.className).toBe('input')
  })

  test('does not cross-route: x-maxLength stays on field bag; v-initialValue stays on validator bag', () => {
    const [field, , validator] = extractFieldPropsAndComponentProps({
      ...base,
      'x-maxLength': 20,
      'v-initialValue': 'hi',
    })

    // Untyped misuse: prefix wins over key name
    expect((field as any).maxLength).toBe(20)
    expect(validator.maxLength).toBeUndefined()
    expect((validator as any).initialValue).toBe('hi')
    expect(field.initialValue).toBeUndefined()
  })

  test('v-* never lands on field even for field-like names', () => {
    const [field, , validator] = extractFieldPropsAndComponentProps({
      ...base,
      'v-display': 'hidden',
      'v-maxLength': 8,
    })

    expect(field.display).toBeUndefined()
    expect((validator as any).display).toBe('hidden')
    expect(validator.maxLength).toBe(8)
  })

  test('supports kebab-case after hyphen prefix', () => {
    const [field, , validator] = extractFieldPropsAndComponentProps({
      ...base,
      'x-initial-value': 1,
      'x-read-pretty': true,
      'v-max-length': 10,
    })

    expect(field.initialValue).toBe(1)
    expect(field.readPretty).toBe(true)
    expect(validator.maxLength).toBe(10)
  })

  test('x-ref maps to internal $$ref', () => {
    const box = { set: () => {}, get: () => {} } as any
    const [field] = extractFieldPropsAndComponentProps({
      ...base,
      'x-ref': box,
    })

    expect(field.$$ref).toBe(box)
  })

  test('x-* and $$* can coexist; later entry wins for same target key order', () => {
    const [field] = extractFieldPropsAndComponentProps({
      ...base,
      'x-required': false,
      $$required: true,
    })

    expect(field.required).toBe(true)
  })
})
