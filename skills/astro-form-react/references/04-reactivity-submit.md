# 04 — Reactivity, submit & validate

**Scope:** how React components subscribe to the MobX-backed form model; when `observer` is
required vs optional; reading `values` / `errors` / `submitting` / `valid`; `submit` /
`validate` / `reset` semantics; feedback & per-field error display patterns; batching notes
(React 18+ with MobX).

Public API only: `f.*`, `x-*` / `v-*` directives, `observer`, `useForm`, `FormProvider`,
`useRef` (field box), `createForm`, `mobx` namespace. No internal prefixes.

---

## 1. Mental model (30 seconds)

- `createForm()` returns a **Form** model; every field (`f.String` etc.) registers a **Field**
  model on it. Both are **MobX observables** (`mobx 7`, annotated with `observable` /
  `computed` / `action`).
- React never sees these models re-render by magic. A component re-renders on model change
  only when it is wrapped in **`observer`** and **reads** the observables during render.
- **Field components are already observers internally.** `f.String name="email" as="input"`
  re-renders its own `<input>` when the field's `value` / `display` / `componentProps` change —
  you do not need to wrap anything for that.
- Everything else (buttons, summaries, error lists, wrappers that read form state) subscribes
  on demand with `observer`.

```tsx
import { createForm } from '@astro-form/core'
import { FormProvider, f, observer, useForm } from '@astro-form/react'

function App() {
  const form = createForm() // keep stable — see ref 01 (useMemo)
  return (
    <FormProvider form={form}>
      <EmailInput />
      <SubmitButton />
      <ErrorBanner />
    </FormProvider>
  )
}
```

`observer` is re-exported by `@astro-form/react` (from `mobx-react-lite`); the `Observer`
component is available too, but prefer the `observer` HOC for readability.

---

## 2. When parent must use `observer` vs field-only trees

### Field-only trees: no user observer needed

A tree that only declares fields — no parent reads any reactive state — works with **zero**
`observer` in user code:

```tsx
function ProfileForm() {
  return (
    <>
      <f.String name="firstName" as="input" x-required />
      <f.String name="lastName" as="input" x-required />
      <f.String name="email" as="input" v-format="email" />
    </>
  )
}
```

Each `f.*` re-renders itself when its own value/display changes. The parent never re-renders on
keystrokes, which is the point.

### Parent / sibling must be `observer` when it READS reactive state

Wrap **any** component whose render reads any of these:

| What you read | Example | Needs observer? |
|---|---|---|
| `form.values` or a deep path of it | `form.values.email` | ✅ |
| `form.errors` / `form.warnings` / `form.successes` | error banner | ✅ |
| `form.valid` / `form.invalid` | disable save button | ✅ |
| `form.submitting` / `form.validating` / `form.loading` | spinner, button label | ✅ |
| `form.modified` | "unsaved changes" hint | ✅ |
| `form.pattern` / `form.display` / `form.editable` | read-only chrome | ✅ |
| field model via a ref box | `box.get()?.selfErrors` (see §6) | ✅ |
| `form.query(...).take()` result reads | `field.selfErrors` | ✅ |
| Static layout, labels, hardcoded children | `<div>Sign up</div>` | ❌ |

Rule of thumb: **if it renders values or status, wrap it in `observer`.** If it only renders a
fixed structure, don't.

```tsx
// ❌ Stale: this component will NOT update on submit start / error changes
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

Notes:

- **Children passed to a field render inside `FieldProvider`** (basePath = the field's path).
  If those children read form state, wrap **them** in `observer` too — the field's own observer
  does not subscribe for sibling content.
- `observer` reads are tracked per-component. Two components reading different slices re-render
  independently (MobX granularity), so splitting big forms into small observer components is the
  recommended performance habit — not a requirement for correctness.
- Don't double-wrap for no reason; it's harmless but noisy.

---

## 3. Reading values

```tsx
const Summary = observer(function Summary() {
  const form = useForm()
  // reactive: re-renders when any read path changes
  return <p>{form.values.firstName} {form.values.lastName} · {form.values.address?.city}</p>
})
```

- `form.values` is the **live observable** object. Deep reads like `form.values.address.city`
  are tracked (the object is a MobX proxy). Reading it is fine; **mutating it in render is not**
  — prefer field input or `form.setValues`/`setValuesIn`.
- `form.values` returns a live object. For serialization/comparison take a **snapshot**:

```tsx
import { mobx } from '@astro-form/core'

const snap = mobx.toJS(form.values)        // plain deep clone
const city = form.getValuesIn('address.city') // also a toJS snapshot
```

- `field.value` (`box.get()?.value`) is likewise a **fresh snapshot on every read**
  (`toJS` internally) — never rely on object identity across two reads.
- Programmatic fill: `form.setValues({...})` merges by default; strategies:
  `'merge'` (default) / `'shallowMerge'` / `'overwrite'`. `form.setValuesIn('address.city', 'BJ')`
  sets a single path. Initial values come from `createForm({ initialValues })` or `setInitialValues`.
- The submit handler receives a snapshot — see §5. `form.onInput` writes come from real DOM
  events; values you set programmatically bypass `selfModified`/`form.modified` semantics, which
  matters for `reset` (see §7).

---

## 4. Reading status: errors / valid / submitting / validating

All status getters are reactive computed values — read them inside `observer` components.

```tsx
const ErrorBanner = observer(function ErrorBanner() {
  const form = useForm()
  if (form.valid) return null
  return (
    <ul className="form-errors">
      {form.errors.map((e) => (
        <li key={e.path}>{e.path}: {e.messages.join('; ')}</li>
      ))}
    </ul>
  )
})
```

Feedback entry shape (`IFormFeedback`):

```ts
{
  type: 'error' | 'warning' | 'success',
  path: string,            // field path, e.g. 'address.city'
  code: 'ValidateError' | 'EffectError' | ..., // from validator or setSelfErrors
  triggerType: 'onInput' | 'onFocus' | 'onBlur' | undefined,
  messages: string[],      // non-empty only (empty feedbacks are filtered out)
}
```

Form-level status:

| Getter | Meaning |
|---|---|
| `form.errors` | all error feedbacks (with messages) across the tree |
| `form.warnings` / `form.successes` | same, by type |
| `form.valid` / `form.invalid` | `errors.length === 0` / `> 0` |
| `form.submitting` | true from the start of `submit` until it settles (success or throw) |
| `form.validating` | true while a `validate()`/`submit()` validation pass is in flight |
| `form.loading` | manual flag (`setLoading`); nothing sets it automatically |
| `form.modified` | true once any field received user input; reset sets it back to false |

Field-level status (via a ref box — see §6):

| Getter | Meaning |
|---|---|
| `field.selfErrors` | `string[]` — messages on **this field only** |
| `field.errors` | `IFormFeedback[]` — this field **and descendants** (object/array children) |
| `field.selfValid` / `field.valid` | `selfErrors`/`errors` empty |
| `field.validateStatus` | `'validating' \| 'error' \| 'warning' \| 'success' \| undefined` — perfect for styling |
| `field.validating` | true while this field is validating |

Typical submit-button pattern:

```tsx
const SubmitButton = observer(function SubmitButton() {
  const form = useForm()
  return (
    <button type="submit" disabled={form.submitting}>
      {form.submitting ? 'Saving…' : 'Save'}
    </button>
  )
})
```

> Prefer driving the button only by `form.submitting`. A `disabled={form.invalid}` button is
> only meaningful **after** a validation pass has run (initial `errors` is empty), so pair it
> with a form-level "has been validated" signal if you want progressive disabling.

---

## 5. `form.submit` — flow and contracts

Source semantics (`Form.submit`):

1. `form.submitting = true` (synchronously).
2. Validate the whole tree (`validate()`). Validation failures are **recorded but swallowed
   here**; the check happens next.
3. If still `invalid` → **rejects with `form.errors`** (a plain array, not an `Error`).
4. Otherwise calls `onSubmit(toJS(form.values))` — **a plain snapshot** — or, with no callback,
   resolves with the snapshot itself.
5. `form.submitting = false`; resolves with the handler's return value.
6. If `onSubmit` throws, `form.submitting = false` and the error propagates.

```tsx
const Page = observer(function Page() {
  const form = useForm()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await form.submit(async (values) => {
        await api.save(values) // values: plain object snapshot, safe to send
      })
      toast('saved')
    } catch (err) {
      if (Array.isArray(err)) {
        // validation failed — err === form.errors (IFormFeedback[])
        setShowErrors(true)
        return
      }
      // onSubmit threw — real error
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <f.String name="email" as="input" x-required v-format="email" />
      <SubmitButton />
    </form>
  )
})
```

Plain `<form>` wiring:

```tsx
const AppForm = observer(function AppForm() {
  const form = useForm()
  return (
    <form onSubmit={(e) => { e.preventDefault(); void form.submit(onSubmit) }}>
      <f.String name="email" as="input" x-required v-format="email" />
      <SubmitButton />
    </form>
  )
})
```

Field-level submit (`field.submit(onSubmit)`) mirrors this for a single field (validates the
field subtree first, passes `field.value`).

**Contracts to remember:**

- `submit` **never resolves when validation fails** — it rejects with the feedback array.
- Validation failure is not "an exception"; check `Array.isArray(err)` to tell it apart from
  handler errors.
- `onSubmit` receives `toJS(form.values)` — mutating it does not touch the form.
- `form.valid` reflects validation state even after a handler throws (the model is fine; only
  the handler failed).

---

## 6. Validate & reset

### `form.validate(pattern?)`

Runs `validateSelf` on every matched, **editable + visible + validator-carrying** field
(fields with `display` `none`/`hidden`, non-editable patterns, or no validator are skipped).
Sets `form.validating` true during the pass, fills `errors/warnings/successes`, and **rejects
with `form.errors`** if anything is invalid.

```tsx
try {
  await form.validate()          // whole tree
  // await form.validate('address') // subtree only
  router.push('/next')
} catch (errors) {
  // stay; errors are already rendered by your ErrorBanner
}
```

Field-level: `field.validate()` / `field.validate('onBlur')` — the optional argument picks a
validator **trigger type** (`onInput` / `onFocus` / `onBlur`); without it, all trigger groups
run. Rules can declare `triggerType` (e.g. `{ triggerType: 'onBlur', format: 'url' }`), and
`validateFirst: true` (form- or field-level `x-validateFirst`) stops at the first failing rule.

Automatic triggers: `field.onInput` (wired by the field's internal `onChange`) validates with
trigger `onInput` after every input **only when a validator exists** — so without any
`x-required` / `v-*` / `validator`, no feedback is produced on typing.

### `form.reset(pattern?, options?)`

- Default: each field goes back to `initialValue` (or the typed default — `[]` for arrays,
  `{}` for objects, `undefined` otherwise), **all feedbacks are cleared**, `selfModified` /
  `form.modified` reset, and `ON_FORM_RESET` fires.
- `options.forceClear: true` — value becomes the typed default, ignoring `initialValue`.
- `options.validate: true` — re-validate after reset (feedback may become invalid again; `reset`
  itself does **not** reject — read `form.invalid` after).

```tsx
await form.reset()                            // back to initialValues, clear errors
await form.reset('*', { forceClear: true })   // wipe everything
await form.reset('address')                   // subtree only
await form.reset('*', { validate: true })     // reset then re-validate
// after any reset:
const stillInvalid = form.invalid
```

Notes:

- `reset` only touches fields whose value is **defined** (`value !== undefined`); a key that
  never existed stays absent.
- Programmatic `setValues` writes don't mark fields modified; after `reset` such values are
  also reset (they're in `values`, not `initialValues`) — preload via `initialValues` if reset
  should restore them.

### Clearing feedback programmatically

`form.clearErrors('*')`, `form.clearWarnings(pattern)`, `form.clearSuccesses(pattern)`,
`field.clearFeedback('error')`, and `field.setSelfErrors([...])` for effect-driven messages
(code `EffectError` — useful for server-side validation errors: `field.setSelfErrors(['email already taken'])`).

---

## 7. Feedback display patterns

### a) Global error list (simplest)

```tsx
const ErrorBanner = observer(function ErrorBanner() {
  const form = useForm()
  if (form.valid) return null
  return (
    <ul className="form-errors">
      {form.errors.map((e) => (
        <li key={e.path}>{e.path}: {e.messages.join('; ')}</li>
      ))}
    </ul>
  )
})
```

### b) Per-field errors via a field ref box (recommended for inline display)

`useRef` from `@astro-form/react` returns a MobX `observable.box` that the field fills with its
Field model on mount. Read it inside an observer to display errors inline:

```tsx
import { f, observer, useRef as useBoxRef } from '@astro-form/react'

function EmailField() {
  const box = useBoxRef() // observable.box<Field | null>
  return (
    <div>
      <f.String
        name="email"
        as="input"
        x-required
        v-format="email"
        x-ref={box}
        placeholder="a@b.com"
      />
      <FieldError box={box} />
    </div>
  )
}

const FieldError = observer(function FieldError({ box }: { box: ReturnType<typeof useBoxRef> }) {
  const field = box.get()
  if (!field || field.selfValid) return null
  return <p className="field-error">{field.selfErrors[0]}</p>
})
```

- `field.selfErrors` is `string[]` on the field itself — right for a leaf field's inline error.
- Use `field.errors` (with `path`) on object/array fields when you also want children's errors.
- `field.validateStatus` drives styling/aria:

```tsx
const FieldError = observer(function FieldError({ box }: { box: ReturnType<typeof useBoxRef> }) {
  const field = box.get()
  const status = field?.validateStatus // 'validating' | 'error' | 'warning' | 'success' | undefined
  return (
    <p className={`control-status status-${status ?? 'idle'}`}>
      {status === 'validating' ? 'Checking…' : status === 'error' ? field!.selfErrors[0] : null}
    </p>
  )
})
```

### c) One-off reads with `form.query(path).take()`

For places without a box (e.g. a summary footer), `form.query('email').take()` inside an
observer also stays reactive:

```tsx
const EmailStatus = observer(function EmailStatus() {
  const form = useForm()
  const email = form.query('email').take()
  return <span>{email?.valid ? '✓' : email?.selfErrors[0] ?? '—'}</span>
})
```

> Ref boxes (`x-ref`) are a Field-model handle, not a DOM ref; a full walkthrough of multi-ref /
> wrapper patterns lives in ref 05.

---

## 8. Batching notes (React 18+ with MobX) — measured claims only

- The library runs model writes inside MobX **actions** (`runInAction` / `action` annotations),
  and components subscribe via `mobx-react-lite`. MobX coalesces all observable changes of one
  action into a single notification round; with **React 18/19 automatic batching**, multiple
  writes in one event handler / action produce **one** re-render per observer, not one per write.
- **Do not over-rely on this:** the `submit` / `validate` pipelines are `async` — each `await`
  boundary starts a new microtask. Expect the UI to pass through distinct states over time
  (`submitting=true` render, then `submitting=false` after settle), not one atomically batched
  commit. Model your UI on **derived state** (`form.submitting`, `form.valid`) instead of
  counting renders.
- Observer granularity is per-component: only components that read changed observables
  re-render. Splitting large forms into small observer components keeps re-render cost local.
- Mutating the model **outside** actions/events (timers, promises after `await`, raw
  `form.values.x = ...`) still works but may escape batching; prefer `form.setValues` /
  `setValuesIn` / the documented actions when writing from async code.

---

## 9. Quick reference

```tsx
const form = createForm({ initialValues, values, validateFirst })   // @astro-form/core
const { FormProvider, observer, useForm, f, useRef } = await import('@astro-form/react')

form.values            // live observable (read inside observer)
form.getValuesIn(p)    // toJS snapshot at path
mobx.toJS(form.values) // plain snapshot          // import { mobx } from '@astro-form/core'

form.errors            // IFormFeedback[] (with messages)
form.valid / form.invalid
form.submitting / form.validating / form.loading / form.modified

await form.submit(onSubmit)   // rejects with form.errors when invalid; snapshot to handler
await form.validate('*')      // rejects with form.errors when invalid
await form.reset()            // to initialValues, clears feedbacks; options {forceClear, validate}

field.selfErrors / field.errors / field.validateStatus / field.selfValid
form.clearErrors() / field.setSelfErrors([...])   // effect-driven feedback
```

---

## 10. Open questions

- **StrictMode double-effects:** `FormProvider` calls `form.onMount()`/`onUnmount()` from a
  `useEffect`. Under React 18+ StrictMode (dev), the mount/unmount/mount cycle runs twice; the
  intermediate `form.onUnmount()` destroys registered fields and flips internal flags, and no
  test in `packages/{react,core}` covers this exact sequence. Practical guidance: keep the form
  stable (see ref 01) and don't gate UI on `form.mounted`/`form.unmounted` flags — but the
  exact field-graph behavior under StrictMode remount is **unverified**.
- **`reset` + `validate: true`:** `reset` never rejects (validation results are applied, not
  thrown), so the only way to detect the post-reset state is reading `form.invalid` — confirmed
  against `core/tests/form.test.ts`, but worth a doc-level callout in the SKILL.md FAQ.
