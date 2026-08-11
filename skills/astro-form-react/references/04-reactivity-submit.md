# 04 — Reactivity, submit & validate

Public API. Form/Field are MobX models; React re-renders only via **`observer`** (or internal field observers). Form identity → ref 01; `x-ref` details → ref 05.

## 1. When `observer` is required

| Read during render | Need `observer`? |
|---|---|
| Only `f.*` hosts (no parent reads model) | No — fields are observers |
| `form.values` / deep paths | Yes |
| `form.errors` / `warnings` / `successes` / `valid` / `invalid` | Yes |
| `form.submitting` / `validating` / `loading` / `modified` | Yes |
| `form.pattern` / `display` / `editable` | Yes |
| `useField` / `box.get()` / `form.query(…).take()` then field props | Yes |
| Static layout | No |

```tsx
const SubmitButton = observer(function SubmitButton() {
  const form = useForm()
  return <button disabled={form.submitting}>{form.submitting ? 'Saving…' : 'Save'}</button>
})
```

Children of a field that **themselves** read model state need their own `observer` — the field's observer does not cover siblings. Prefer small observer islands over one giant tree.

## 2. Reading values & status

```tsx
const Summary = observer(function Summary() {
  const form = useForm()
  return <p>{form.values.firstName} · {form.values.address?.city}</p>
})
```

- `form.values` is a live observable — **don't mutate in render**. Snapshot: `mobx.toJS(form.values)` or `form.getValuesIn(path)`.
- `field.value` is `toJS` each read — don't rely on object identity.
- Writes: `setValues` / `setValuesIn` (strategies: `merge` default, `shallowMerge`, `overwrite`). Programmatic sets don't set `selfModified` the same way as input.

### `useField`

Read a registered Field (does not create). Joins like child `name`: `basePath + path`（不是 Formily 的 `.`/`..` 语法）。

```tsx
useField()           // field at current basePath; root → undefined
useField('nick')     // under profile → profile.nick; at root → nick
```

`form.query` / `field.query` / 相对与通配 → ref **07**。`x-ref` box → ref **05**。

| Getter | Meaning |
|---|---|
| `form.errors` | `IFormFeedback[]` with `path`, `messages`, `type`, … |
| `form.valid` / `invalid` | `errors.length === 0` / else |
| `form.submitting` / `validating` | submit/validate in flight |
| `form.modified` | any user input since reset |
| `field.selfErrors` | `string[]` this field only |
| `field.errors` | feedbacks including descendants |
| `field.validateStatus` | `'validating' \| 'error' \| 'warning' \| 'success' \| undefined` |

Prefer `disabled={form.submitting}` over `disabled={form.invalid}` until a validation pass has run (initial `errors` is empty).

## 3. `submit`

1. `submitting = true`  
2. validate tree  
3. if invalid → **reject with `form.errors` (array)**  
4. else `onSubmit(toJS(values))` or resolve snapshot  
5. `submitting = false` (also on handler throw)

```tsx
try {
  await form.submit(async (values) => { await api.save(values) })
} catch (err) {
  if (Array.isArray(err)) { /* validation */ return }
  throw err
}
```

`field.submit` validates that field's subtree. Handler snapshot is plain — mutating it does not touch the form.

## 4. `validate` & `reset`

**`form.validate(pattern?)`** — editable + visible + has-validator fields only; rejects with `form.errors` if invalid. Field-level `field.validate(trigger?)` can target a trigger type.

**`form.reset(pattern?, { forceClear?, validate? })`**

- Default: back to `initialValue` (or `[]`/`{}`/`undefined` typed defaults), clear feedbacks, clear modified flags.
- `forceClear: true` — ignore initialValue.
- `validate: true` — re-validate after; **reset does not reject** — read `form.invalid`.

Only fields with `value !== undefined` are reset. Seed durable defaults via `initialValues`.

Clear feedback: `form.clearErrors` / `field.setSelfErrors([...])` (e.g. server errors, code `EffectError`).

## 5. Feedback UI

**Global**

```tsx
const ErrorBanner = observer(function ErrorBanner() {
  const form = useForm()
  if (form.valid) return null
  return <ul>{form.errors.map((e) => <li key={e.path}>{e.path}: {e.messages.join('; ')}</li>)}</ul>
})
```

**Inline**

```tsx
const EmailError = observer(function EmailError() {
  const field = useField('email')
  if (!field?.selfErrors.length) return null
  return <p>{field.selfErrors[0]}</p>
})
```

Or `x-ref` box / `form.query('email').take()` (ref 05).

## 6. Batching

MobX actions + React 18/19 batching → one re-render per action for observers that read changed data. `submit`/`validate` are **async** — expect intermediate `submitting` flips. Drive UI from **derived state**, not render counts. Prefer documented setters from async code over raw `form.values.x = …`.
