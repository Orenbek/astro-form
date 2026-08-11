---
name: astro-form-react
description: Use when building or fixing React forms with @astro-form/react (@astro-form/core engine). Triggers on form validation & submit/reset, custom controls via `as`, field path/identity bugs, stale renders, or lifecycle pitfalls (form recreated every render, StrictMode, remounts).
---

# astro-form-react — React forms

Plain React under one `FormProvider`. State is MobX (`createForm` from `@astro-form/core`);
`@astro-form/react` is the binding layer: `f.*`, `x-*` / `v-*` directives, normal React props.

## Mental model

| Piece | Rule |
|---|---|
| Form | `useMemo(() => createForm(…), [])` — unstable identity tears down every field |
| Provider | `FormProvider form={form}` required; mounts/unmounts the form |
| Field | `f.String name="email" as="input" x-required` → model at path + controlled host |
| Reactivity | Fields are observers; **you** `observer`-wrap only components that **read** form/field state |
| Directives | **`x-*` → field model**, **`v-*` → validators**, else UI passthrough (strict, hyphen only) |
| Render | Host gets `{…componentProps, …mapFieldToComponentProps(field), onChange, onFocus, onBlur, ref}` — **model wins** on `value`/`checked`/`disabled`/`readOnly` |

Set availability with `x-disabled` / `x-readPretty` / `x-pattern` (mode). Bare DOM `disabled` is not SSOT.

## Quickstart

```tsx
import React from 'react'
import { createForm } from '@astro-form/core'
import { FormProvider, f, observer, useForm } from '@astro-form/react'

const ErrorBanner = observer(() => {
  const form = useForm()
  if (form.valid) return null
  return <ul>{form.errors.map((e) => <li key={e.path}>{e.path}: {e.messages.join('; ')}</li>)}</ul>
})

export default function ContactPage() {
  const form = React.useMemo(() => createForm({ initialValues: { email: '' } }), [])
  return (
    <FormProvider form={form}>
      <form onSubmit={(e) => { e.preventDefault(); void form.submit((v) => console.log(v)) }}>
        <f.String name="email" as="input" type="email" x-required v-format="email" placeholder="you@example.com" />
        <button type="submit">Submit</button>
      </form>
      <ErrorBanner />
    </FormProvider>
  )
}
```

`form.submit` validates first, then runs the handler with a plain snapshot; invalid → **rejects `form.errors`** (`Array.isArray(err)`).

## When to open a reference

| Ref | Open when |
|---|---|
| `01-setup-scaffold.md` | install, exports, `createForm` options, form identity bugs |
| `02-fields-directives.md` | `f.*` matrix, full `x-*`/`v-*` keys, triggers, dual `required`/`pattern` |
| `03-nesting-paths.md` | basePath, arrays, register-only, path identity, display vs unmount |
| `04-reactivity-submit.md` | observer rules, `useField`, errors UI, submit/validate/reset contracts |
| `05-controls-refs-pitfalls.md` | custom `as`, events, `x-ref`, stable props, anti-patterns |
| `06-core-observability.md` | Form/Field property observability, live vs `toJS`, `x-reactions` once |
| `07-path-and-query.md` | FormPath, relative/wildcard query, `form.query` / `field.query` / `useField` |

## Directives (strict)

```tsx
<f.String name="pwd" as="input" x-required v-minLength={8} v-maxLength={64} v-format="email" />
<f.String name="nick" as="input" x-initialValue="ada" x-readPretty />
```

- **`x-*` field:** `initialValue`, `display`/`visible`/`hidden`, `pattern` (**mode**), `required`, `disabled`, `readPretty`, `editable`, `validator`, `reactions`, `basePath`, `ref`, …
- **`v-*` rules:** `format`, `required`, `pattern` (**regex**), `minLength`/`maxLength`, `min`/`max`, `enum`, …
- Wrong bucket is a no-op for that intent (`x-maxLength` ≠ maxLength rule → use `v-maxLength`).
- Prefer `x-disabled` / `x-readPretty` over raw `x-pattern` for mode.
- Default rule trigger `'onInput'`; blur: `x-validator={[{ required: true, triggerType: 'onBlur' }]}`.

Full tables → ref 02.

## Fields & nesting

| Component | Role |
|---|---|
| `f.String` / `f.Number` / `f.Boolean` | Leaf fields (`Number` does not coerce strings; checkbox `type="checkbox"` → boolean) |
| `f.Object` / `f.Array` | Containers; children inherit path as `basePath` |
| no `as` | Register-only (path + model, no host element) |

Path = `basePath + name` (dots OK: `name="address.city"`). Identity is the path string.

**Arrays:** no render-prop children — `observer` + package `useRef` box + index names + `key={i}`:

```tsx
const listBox = useRef() // from '@astro-form/react', not React.useRef
const list = listBox.get()?.value ?? []
// <f.Array x-ref={listBox}> … name={`${i}.title`} key={i} … push/remove via listBox.get()
```

Box fills in a mount effect → first paint may be empty. Reorder with `ArrayField.move*`, not id keys.

**Hide vs unmount:** `x-hidden` / `x-display="hidden"` keeps model + values (validation skipped).  
`{cond && <f.*>}` → cleanup `onUnmount` + **`destroy()`** (values cleared). Use display for keep-on-toggle.

Details → ref 03.

## Reactivity, submit, feedback

- Observer only for readers of `form.values` / `errors` / `submitting` / field models / `query().take()`.
- Snapshot: `mobx.toJS(form.values)` or `form.getValuesIn(path)`.
- `await form.submit(fn)` · `validate()` · `reset()` / `reset('*', { forceClear, validate })`.
- Inline errors: `observer` + `useField(path)` / `x-ref` / `query` → `field.selfErrors` / `validateStatus`.

Details → ref 04.

## Custom `as` & `x-ref`

```tsx
function NumberInput({ value, onChange, disabled, readOnly, ...rest }: any) {
  return (
    <input type="number" value={value ?? ''} disabled={disabled} readOnly={readOnly}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} {...rest} />
  )
}
```

- Prefer plain `onChange` values; bubbled non-self events are dropped.
- Stable `useCallback` for handler/object passthrough (else `componentProps` thrash).
- `x-ref` = package `useRef` (MobX box) → Field model; React `ref` → DOM. Null first render.
- After unmount the box may still hold a **destroyed** field — re-query or check `destroyed`.

Details → ref 05.

## High-frequency pitfalls

| Don't | Do |
|---|---|
| `createForm()` each render | `useMemo(() => createForm(), [])` |
| `React.useRef` for `x-ref` | package `useRef` |
| `x-pattern` for regex / `v-pattern` for mode | **swap** (`v-pattern` = regex; mode via `x-disabled` / `x-readPretty`) |
| Bare `disabled` as form state | `x-disabled` |
| `{cond && <Field />}` to keep values | `x-hidden` |
| Read model without `observer` | wrap the reader |
| Native `type="number"` without parse | custom `as` with `Number(...)` |

## Core API (import from `@astro-form/core`)

```ts
createForm({ values, initialValues, pattern, display, validateFirst, effects })
form.values · mobx.toJS(form.values) · getValuesIn / setValuesIn / deleteValuesIn
form.errors · valid · submitting · modified
form.submit(onSubmit?) · validate(pattern?) · reset(pattern?, opts?)
form.clearErrors · field.setSelfErrors · form.query / field.query · useField
```


## Non-goals

No separate core skill. Public React surface is `x-*` / `v-*` + normal props + `f.*` / provider / hooks above.
