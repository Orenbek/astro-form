import React from 'react'
import { describe, expect, test } from '@rstest/core'
import { render, renderHook } from '@testing-library/react'
import { createForm } from '@astro-form/core'
import { extractFieldPropsAndComponentProps, normalizeDirectiveKey } from '../src/utils/extract-field-props'
import { mapFieldToComponentProps } from '../src/utils/map-field-to-component-props'
import { shallowEqualRecord } from '../src/utils/shallow-equal'
import { ValueType } from '../src/types'
import { FormProvider } from '../src/FormContext'
import { FieldProvider } from '../src/FieldContext'
import { f } from '../src/Field'
import { useField } from '../src/hooks/useField'

describe('mapFieldToComponentProps', () => {
  test('projects value and default interaction flags', () => {
    const form = createForm()
    const field = form.createField({ name: 'email', value: 'a@b.com' })!
    expect(mapFieldToComponentProps(field)).toEqual({
      value: 'a@b.com',
      disabled: false,
      readOnly: false,
    })
  })

  test('disabled / readPretty map to disabled / readOnly', () => {
    const form = createForm()
    const field = form.createField({ name: 'email' })!
    field.disabled = true
    expect(mapFieldToComponentProps(field)).toMatchObject({ disabled: true, readOnly: false })
    field.readPretty = true
    expect(mapFieldToComponentProps(field)).toMatchObject({ disabled: false, readOnly: true })
  })

  test('checkbox uses checked boolean instead of value', () => {
    const form = createForm()
    const field = form.createField({
      name: 'agree',
      value: true,
      component: ['input', { type: 'checkbox' }],
    })!
    expect(mapFieldToComponentProps(field)).toEqual({
      checked: true,
      disabled: false,
      readOnly: false,
    })
  })

  test('null field returns empty projection', () => {
    expect(mapFieldToComponentProps(null)).toEqual({})
  })
})

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

describe('useField', () => {
  test('no path at root returns undefined', () => {
    const form = createForm()
    form.createField({ name: 'email', value: 'a@b.com' })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(FormProvider, { form }, children)

    const { result } = renderHook(() => useField(), { wrapper })
    expect(result.current).toBeUndefined()
  })

  test('path joins basePath like child field registration', () => {
    const form = createForm()
    form.createField({ name: 'email', basePath: 'user', value: 'a@b.com' })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(FormProvider, { form }, React.createElement(FieldProvider, { basePath: 'user' }, children))

    const { result } = renderHook(() => useField('email'), { wrapper })
    expect(result.current?.path.toString()).toBe('user.email')
    expect(result.current?.value).toBe('a@b.com')
  })

  test('no path resolves nearest FieldProvider path after f.* mount', () => {
    const form = createForm({ initialValues: { profile: { nick: 'ada' } } })
    let seen: string | undefined

    const Probe = () => {
      const field = useField()
      seen = field?.path.toString()
      return null
    }

    render(
      React.createElement(
        FormProvider,
        { form },
        React.createElement(
          f.Object,
          { name: 'profile' },
          // Probe is a child of Object → basePath is `profile` (field exists from parent render)
          React.createElement(Probe, null),
          React.createElement(f.String, { name: 'nick', as: 'input' })
        )
      )
    )

    expect(seen).toBe('profile')
    expect(form.query('profile.nick').take()?.value).toBe('ada')
  })

  test('path under nested field resolves full path', () => {
    const form = createForm({ initialValues: { profile: { nick: 'ada' } } })
    let seen: string | undefined

    const Probe = () => {
      const field = useField('nick')
      seen = field?.path.toString()
      return null
    }

    render(
      React.createElement(
        FormProvider,
        { form },
        React.createElement(
          f.Object,
          { name: 'profile' },
          // Register leaf first so sibling probe can query it on the same pass
          React.createElement(f.String, { name: 'nick', as: 'input' }),
          React.createElement(Probe, null)
        )
      )
    )

    expect(seen).toBe('profile.nick')
  })

  test('path at form root is absolute-from-root (empty basePath)', () => {
    const form = createForm()
    form.createField({ name: 'email', value: 'a@b.com' })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(FormProvider, { form }, children)

    const { result } = renderHook(() => useField('email'), { wrapper })
    expect(result.current?.path.toString()).toBe('email')
    expect(result.current?.value).toBe('a@b.com')
  })

  test('missing path returns undefined', () => {
    const form = createForm()
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(FormProvider, { form }, children)

    const { result } = renderHook(() => useField('missing'), { wrapper })
    expect(result.current).toBeUndefined()
  })
})
