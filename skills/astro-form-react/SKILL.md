---
name: astro-form-react
description: Use when building or fixing React forms with @astro-form/react (@astro-form/core engine). Triggers on form validation & submit/reset, custom controls via `as`, field path/identity bugs, stale renders, or lifecycle pitfalls (form recreated every render, StrictMode, remounts).
---

# astro-form-react — React forms

Forms are **plain React components** rendered under one `FormProvider`. The state model is
MobX-backed (`createForm` from `@astro-form/core`); `@astro-form/react` provides the React
bindings. You write `f.*` field components, `x-*` / `v-*` directives, and normal React props.

## Mental model (30 seconds)

- `createForm()` → one **Form** model (values, errors, submitting, …). Keep it **stable** with
  `useMemo(() => createForm(), [])` — recreating it per render unmounts every field and loses
  all state (see Lifecycle).
- `FormProvider form={form}` mounts/unmounts the form (`onMount`/`onUnmount`) and gives fields a
  home. Every field must render under a provider.
- `f.String name="email" as="input" x-required` → registers a **Field model** at path `email`
  and renders a controlled `<input>`. Field components are **already observers** — they re-render
  their own control on change.
- **You** wrap components in `observer` only when they **read** form/field state
  (`form.values`, `form.errors`, `field.selfErrors`, `form.submitting`, …) during render.
- `x-*` / `v-*` props are the declarative API for field model + validation rules. Everything else
  you pass is forwarded to the rendered control.

## Quickstart (minimal working page)

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
      <form onSubmit={(e) => { e.preventDefault(); void form.submit((values) => console.log(values)) }}>
        <f.String name="email" as="input" type="email" x-required v-format="email" placeholder="you@example.com" />
        <button type="submit">Submit</button>
      </form>
      <ErrorBanner />
    </FormProvider>
  )
}
```

`form.submit()` validates first, then calls your handler with a plain values snapshot; on
validation failure it **rejects with `form.errors`** (an array — check `Array.isArray(err)`).

## Reading guide — read references only when you need them

| Reference | Read it when | Key content |
|---|---|---|
| `references/01-setup-scaffold.md` | Installing, first scaffold, or "form loses state / remounts on every render" | deps, exports, createForm options, FormProvider lifecycle, **stable form identity** |
| `references/02-fields-directives.md` | Choosing field types or writing directives | f.* matrix, `x-*`/`v-*` routing matrix, validator keys, dual-key `required`/`pattern`, `as` passthrough, per-type examples |
| `references/03-nesting-paths.md` | Nested objects/arrays, FieldProvider, dynamic lists, path-identity bugs | path model, basePath inheritance, `x-basePath`, array patterns, register-only fields, ghost fields, React keys |
| `references/04-reactivity-submit.md` | Reading values/errors, submit/validate/reset, feedback display | observer rules, status getters, submit/validate/reset contracts, per-field error patterns, batching |
| `references/05-controls-refs-pitfalls.md` | Custom controls, x-ref, refs, or "my field misbehaves" | `as` contract, event semantics, stable callbacks, x-ref boxes, multi-ref patterns, anti-pattern list + FAQ |

## 1. Scaffold — install & stable form

```bash
npm install @astro-form/react @astro-form/core   # peer: react >= 18
```

```tsx
import { createForm } from '@astro-form/core'
import { FormProvider } from '@astro-form/react'

const form = React.useMemo(() => createForm({ initialValues, validateFirst: true }), [])
<FormProvider form={form}>…fields…</FormProvider>
```

- **Never** call `createForm()` inline in the render body. The mount effects of the provider and
  every field depend on the **form identity**; a fresh instance per render tears down the whole
  field graph and starts an empty form. This is the #1 bug in this library.
- A form that was unmounted is terminal — create a new one instead of reusing it.
- Under StrictMode (dev) effects double-run; this is harmless **only when the form instance is
  stable**. Don't gate UI on `form.mounted`/`form.unmounted`.
- Read `references/01-setup-scaffold.md` when scaffolding or debugging state loss.

## 2. Fields — `f.*` components

| Component | Core model | Use for |
|---|---|---|
| `f.String` | `Field` | text / scalar values |
| `f.Number` | `Field` | numbers (no auto-coercion — parse in your control, see §7) |
| `f.Boolean` | `Field` | booleans (native checkbox stores its `value` attr, not `checked` — prefer a custom control) |
| `f.Object` | `ObjectField` | object container; children join the path automatically |
| `f.Array` | `ArrayField` | array container; item fields use index names (`name="0.title"`) |

Every field: **`name` is required** (path segment, dots allowed: `name="address.city"`),
`as` picks the rendered element/component, `children` render inside it (for `Object`/`Array`,
children automatically inherit the field's path as `basePath`). With no `as` the field is
register-only (no element, still a field node + path scope for children).

```tsx
<f.Object name="user" as="fieldset" x-initialValue={{ name: '', address: { city: '' } }}>
  <legend>User</legend>
  <f.String name="name" as="input" x-required />
  <f.String name="address.city" as="input" />
</f.Object>
// form.values.user → { name, address: { city } }
```

Field identity = final path (`basePath + name`). Same path = same field instance; changing
`name`/`basePath` at runtime leaves the old path registered ("ghost field") — don't do it.
Details and per-type examples: `references/02-fields-directives.md`.

## 3. Directives — `x-*` / `v-*` routing

Props are split at mount into **field-model props**, **validator rules**, and **UI passthrough**
(anything else goes to the `as` control). Routing by prefix:

| Prefix | Rule |
|---|---|
| `x-*` | **validator** if the suffix is a validator key, **else field-model** (validator-first) |
| `v-*` | **field-model** if the suffix is a field key, **else validator** (field-first) |

```tsx
<f.String name="pwd" as="input" x-required v-minLength={8} x-maxLength={64} x-format="email" />
<f.String name="nick" as="input" x-initialValue="ada" x-display="visible" x-readPretty />
```

- Field-model keys: `initialValue`, `display`, `visible`, `hidden`, `pattern`, `required`,
  `editable`, `disabled`, `readPretty`, `dataSource`, `validator`, `data`, `validateFirst`,
  `reactions`, `basePath`, `ref`. Kebab-case after the prefix is fine
  (`x-initial-value` ≡ `x-initialValue`).
- **Use hyphen directives only (`x-…` / `v-…`).** Colon attributes (`x:…` / `v:…`) are **not**
  routed to the field model or validators — they fall through as UI passthrough and are
  silently ignored. Always write hyphens.
- Validator keys: `format`, `required`, `pattern`, `min`/`max`/`minimum`/`maximum`,
  `exclusiveMinimum`/`exclusiveMaximum`, `minLength`/`maxLength`, `minItems`/`maxItems`,
  `minProperties`/`maxProperties`, `len`, `whitespace`, `enum`, `const`, `multipleOf`,
  `uniqueItems`. **Validator-only keys under `x-`** (e.g. `x-maxLength`) have no field-model
  meaning — they always route to validation.
- **Dual keys `required` and `pattern`** exist in both sets — prefix decides the meaning:
  - `x-required` → validator ("must be filled"); `v-required` → field prop (same end state).
  - `x-pattern` → **validation regex**; `v-pattern` → **interaction mode** (`'editable'` |
    `'disabled'` | `'readPretty'`). `v-pattern="readPretty"` is a common trap vs
    `x-pattern={/.../}`.
- Rules default to `triggerType: 'onInput'` (they fire while typing). For blur/focus, declare
  `x-validator={[{ required: true, triggerType: 'onBlur' }]}`.
- Validation is skipped for non-editable / non-visible fields.

Full matrices and examples: `references/02-fields-directives.md`.

## 4. Nesting — FieldProvider, basePath, arrays

Path = `basePath + name`. Each field provides its own path as `basePath` to its children, so
nesting is automatic — no manual wiring.

- **Group without a container field**: `FieldProvider` (public export) scopes a subtree:

```tsx
import { FieldProvider, f } from '@astro-form/react'
<FieldProvider basePath="profile">
  <f.String name="nick" as="input" />   {/* profile.nick */}
</FieldProvider>
```

- **Override inheritance**: `x-basePath` redirects a field's data slot (e.g. reusable inputs):

```tsx
function EmailInput({ path }: { path: string }) {
  return <f.String name="email" x-basePath={path} as="input" x-required />
}
<EmailInput path="user.contact" />   {/* user.contact.email */}
```

- **Dynamic arrays**: `children` are not render-props. Map items inside an `observer` reading the
  array field via a field box (`x-ref`), with **index names** and **`key={i}`**:

```tsx
import { observer, f, useRef as useFieldRef } from '@astro-form/react'   // package useRef = MobX observable.box

const Todos = observer(() => {
  const listBox = useFieldRef()                       // box.get() / box.set(); NOT React useRef
  const list = listBox.get()?.value ?? []             // box.get() → Field model; .value → items (reactive)
  return (
    <f.Array name="todos" as="div" x-ref={listBox} x-initialValue={[{ title: '' }]}>
      {list.map((_, i) => (
        <div key={i}>
          <f.String name={`${i}.title`} as="input" x-required />
          <button onClick={() => listBox.get()?.remove(i)}>remove</button>
        </div>
      ))}
      <button onClick={() => listBox.get()?.push({ title: '' })}>add</button>
    </f.Array>
  )
})
```

- `ArrayField` methods (`push`, `pop`, `insert`, `remove`, `move`, `moveUp`, `moveDown`) rewrite
  child field paths for you — reorder via these methods, never by re-keying with stable ids.
- **First-paint note:** the box is filled in a mount **effect** (after first commit), so the
  observer's first render reads `null` → `[]` → zero rows, then the box fills and items appear.
  That one-frame empty pass is expected; don't add local state to "fix" it.
- Container fields cascade `display`/`pattern` to descendants (hide/disable/readonly a whole
  block by setting the container).
- Hidden (`display !== 'visible'`) containers unmount their subtree's **React** elements, but the
  field models stay registered and values **survive `'hidden'`** (only `'none'` clears the value
  subtree); hidden fields are skipped by validation. If values must survive, prefer
  `x-display="hidden"` / `x-hidden` over conditional rendering.
- Don't render `<FieldProvider basePath={undefined}>` — fields silently fail to register.

Full patterns + path-identity rules: `references/03-nesting-paths.md`.

## 5. Reactivity — when `observer` is required

- **Field components are observers internally.** A tree of fields only — no parent reading state —
  needs **zero** `observer` from you.
- Wrap **any component that reads reactive state during render**:

```tsx
// ❌ Stale — won't update
function SubmitButton() {
  const form = useForm()
  return <button disabled={form.submitting}>{form.submitting ? '…' : 'Save'}</button>
}

// ✅ Reactive
const SubmitButton = observer(function SubmitButton() {
  const form = useForm()
  return <button disabled={form.submitting}>{form.submitting ? 'Saving…' : 'Save'}</button>
})
```

Reads that need `observer`: `form.values` / deep paths, `form.errors`/`warnings`/`successes`,
`form.valid`/`invalid`, `form.submitting`/`validating`/`loading`/`modified`, `form.pattern`/
`display`/`editable`, field model reads via a box or `form.query(path).take()`.

- Reading values: `form.values` is the live observable (read, don't mutate). For serialization
  take a snapshot: `mobx.toJS(form.values)` (`import { mobx } from '@astro-form/core'`) or
  `form.getValuesIn('address.city')`.
- `observer` tracks per component — split big forms into small observer components; unchanged
  siblings don't re-render.
- Status getters for UI: `form.errors` (IFormFeedback[] with `path`/`messages`), `form.valid`,
  `form.submitting`; per-field via box: `field.selfErrors`, `field.errors`, `field.validateStatus`
  (`'validating' | 'error' | 'warning' | 'success'`), `field.selfValid`.
- Batching: model writes are actions; React 18/19 batches within an event. `submit`/`validate`
  are async, so drive UI from derived state (`form.submitting`) — don't count renders.

Full rules + patterns: `references/04-reactivity-submit.md`.

## 6. Submit / validate / reset / feedback

Minimal core API used from React (no separate core skill):

```tsx
await form.submit(async (values) => { await api.save(values) })  // validates; rejects with form.errors when invalid
await form.validate()        // validate whole tree (or form.validate('address'))
await form.reset()           // back to initialValues, clears feedback
await form.reset('*', { forceClear: true })  // wipe to typed defaults
await form.reset('*', { validate: true })    // reset then re-validate (read form.invalid after)
```

- `form.submit` resolves **only when valid**; on invalid it rejects with `form.errors` (plain
  array — `Array.isArray(err)` distinguishes it from a handler error). `onSubmit` gets a plain
  `toJS` snapshot.
- Server-side errors: `field.setSelfErrors(['email already taken'])`.
- Per-field inline errors: read `field.selfErrors` / `field.validateStatus` via a field box
  inside an observer (`references/04-reactivity-submit.md` §7 for the pattern).

## 7. Custom controls — the `as` contract

`as` can be a DOM tag or a React component. Your control receives:

| Prop | Meaning |
|---|---|
| `value` | current model value — always treat the control as **controlled** |
| `onChange(value)` | **pass a plain value** (`onChange(e.target.value)`, `onChange(e.target.checked)`, `onChange(42)`); never a bubbling DOM event (non-self events are silently dropped) |
| `onFocus()` / `onBlur()` | validation triggers; pass no args or plain values |
| `pattern` | interaction mode `'editable' \| 'disabled' \| 'readPretty'` — **not** a validation regex; native elements don't auto-disable, your control should honor it |
| `ref` | React ref → DOM node (unrelated to `x-ref`) |
| everything else | passthrough (`placeholder`, `className`, your own handlers…) |

```tsx
function NumberInput({ value, onChange, pattern, ...rest }: any) {
  return (
    <input type="number" value={value ?? ''} disabled={pattern !== 'editable'}
           onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} {...rest} />
  )
}
<f.Number name="age" as={NumberInput} x-minimum={0} />
```

- Your own `onChange`/`onFocus`/`onBlur` still run — **after** the model write.
- Keep handlers and any object/array/function prop **stable** (`useCallback`): inline handlers
  rewrite the model's UI props on every parent render.
- `f.Boolean` checkbox: call `onChange(e.target.checked)`. `f.Number`: the model does **not**
  coerce strings — parse in the control.
- `f.*` without `as` renders no element (register-only container).

Details + more examples: `references/05-controls-refs-pitfalls.md` §1–3.

## 8. `x-ref` — the field model box (not a DOM ref)

`x-ref` hands you the **core Field model** (MobX-observable), for reading value/errors/status and
calling model methods.

```tsx
import { useRef, f, observer } from '@astro-form/react'   // package useRef = MobX observable.box

const emailBox = useRef()                                  // box.get() / box.set(); NOT React.useRef

<f.String name="email" as={TextInput} x-ref={emailBox} />

const EmailStatus = observer(() => {
  const field = emailBox.get()
  if (!field) return null          // box is filled in an effect → null on first render
  return <span>{field.selfValid ? '✓' : field.selfErrors[0]}</span>
})
```

- Create the box with the **package's `useRef`** (`observable.box`); passing `React.useRef`'s
  `{current}` object crashes (no `.set`).
- The box is filled after mount; **null on first render** — null-guard.
- Never cleared on unmount; check `field.mounted`/`field.destroyed` if you read it later.
- **Multi-consumer** (control + label + errors): pass an **array of boxes**
  (`x-ref={[controlBox, labelBox, errorsBox]}`), or — usually simplest — query on demand:
  `form.query('email').take()` inside an observer.
- DOM access is the **React `ref`** prop (`<f.String as="input" ref={inputRef} />`) — unrelated.

Full walkthrough: `references/05-controls-refs-pitfalls.md` §4–5.

## 9. Lifecycle pitfalls

| Pitfall | Why it hurts | Fix |
|---|---|---|
| `createForm()` in the render body | new form identity each render → provider + every field unmount/remount, state lost | `useMemo(() => createForm(), [])` or module-level |
| Changing `name` / `basePath` at runtime | old path stays registered ("ghost field": value leaks into submit, may validate) | keep `name` stable per slot; move data with `ArrayField` methods |
| Rendering a field in two places with the same path | both share one Field model, UI props overwrite each other | one render site per path |
| Reading model state without `observer` | UI never re-renders | wrap the reader in `observer` |
| `f.*` outside `FormProvider` | `useForm()` returns null → crash | always under a provider |
| Reusing an unmounted form | `onUnmount` is terminal | create a new form |
| StrictMode double effects | mount/unmount/mount in dev | safe only with a **stable form**; don't gate on `mounted` flags |

## 10. Anti-patterns & FAQ — quick index

The full 17-item anti-pattern table + troubleshooting FAQ live in
`references/05-controls-refs-pitfalls.md` §6–7. Highest-frequency ones:

1. **Unstable `createForm()`** — state loss on every render. (→ §1 / ref 01)
2. **`React.useRef` for `x-ref`** — runtime crash; use the package's `useRef`.
3. **Native `f.Boolean` checkbox / `f.Number` input** — stores `"on"` / strings; use a custom
   control that passes parsed values.
4. **`x-pattern` vs `v-pattern`** — regex validator vs interaction mode.
5. **Bubbled events in `onChange`** — silently dropped; pass plain values.
6. **Inline handler props** — model UI props rewritten every render; use `useCallback`.
7. **`box.get()` on first render / after unmount** — null-guard; check `mounted`/`destroyed`.

## Companion core API (from `@astro-form/core`)

Only these are needed from core; everything else lives in `@astro-form/react`.

```ts
createForm({ values, initialValues, pattern, display, validateFirst, effects })  // -> Form
form.values            // live observable (read inside observer)
mobx.toJS(form.values) // plain snapshot            (import { mobx } from '@astro-form/core')
form.getValuesIn(p) / setValuesIn(p, v) / deleteValuesIn(p)
form.errors / form.warnings / form.successes / form.valid / form.invalid
form.submitting / form.validating / form.modified
form.submit(onSubmit?) / form.validate(pattern?) / form.reset(pattern?, options?)
form.clearErrors(pattern?) / field.setSelfErrors([...])
form.query(pattern)    // Query: .take(), .map() — path-scoped field access
```

## Non-goals

- No separate core skill — the minimal core API above is the companion surface for React usage.
- Public directive API is only `x-*` / `v-*` plus normal React props.
