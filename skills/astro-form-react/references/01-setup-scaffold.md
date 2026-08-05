# 01 — Install & scaffold

> Audience: coding agents building React forms with `@astro-form/react`.
> Public API only — `x-*` / `v-*` directives and normal React props.
>
> Source evidence: `packages/react/src/**`, `packages/core/src/models/Form.ts`,
> `packages/core/src/shared/externals.ts`, `packages/core/src/types.ts`.

---

## 1. Install packages

Two packages, both published under the `@astro-form/*` scope (v0.1.0 at time of writing):

```bash
# npm
npm install @astro-form/react @astro-form/core
# pnpm / yarn
pnpm add @astro-form/react @astro-form/core
```

- **`@astro-form/react`** — React bindings: `FormProvider`, `useForm`, field components `f.*`,
  hooks and helpers. `main` → `dist/lib/index.js`, `types` → `dist/types/index.d.ts`.
- **`@astro-form/core`** — the form/field engine: `createForm`, the `Form` model, field models.
  It is a runtime dependency of `@astro-form/react` (workspace dep `"@astro-form/core": "workspace:^"`),
  but you import `createForm` **directly** from `@astro-form/core` in app code.

Peer dependency: **`react >= 18.0.0`** (React 18 or 19; the package itself is tested against
React 19). `@astro-form/react` depends on `mobx` / `mobx-react-lite` and `@formily/validator`
internally — you do **not** install or import them yourself, except that `observer` is
re-exported for convenience (see exports below).

> **Open question:** package.json declares `publishConfig.registry = npmjs.org`, but we could not
> verify that `@astro-form/react@0.1.0` is actually published on the public registry. If install
> from the registry fails, link the monorepo packages locally (pnpm workspace / `yalc` / npm
> `file:`). Everything else in this reference is registry-independent.

### What `@astro-form/react` exports (public surface)

From `packages/react/src/index.ts`:

| Export | Kind | Purpose |
|---|---|---|
| `FormProvider` | component | Mounts/unmounts the `Form`, provides it via React context |
| `FormContext`, `useForm()` | context / hook | Read the `Form` from context (defaults to `null`) |
| `BaseField` | component | Low-level field component (what `f.*` is built on) |
| `f` | factory | `f.String`, `f.Number`, `f.Boolean`, `f.Object`, `f.Array` |
| `useMount`, `useForceUpdate`, `useRef` | hooks | `useMount` ≈ `useEffect(…, [])` with guard; `useRef` = MobX `observable.box` (see §5 note & `x-ref` reference) |
| `passRefToChild`, `hasSlotProp`, `getFormProps` | utils | Advanced multi-ref / prop helpers; rarely needed in ordinary React forms |
| `observer`, … | re-export | Everything from `mobx-react-lite` (e.g. `observer`) |
| types | types | `FieldProps` / `IFieldProps`, `ValidatorProps`, `HyphenFieldProps`, … |

`FormProvider` props: `{ form: Form, children? }`. The `Form` type comes from `@astro-form/core`.

---

## 2. `createForm` — the form instance

`createForm` lives in `@astro-form/core` (`shared/externals.ts`):

```ts
import { createForm } from '@astro-form/core'

const form = createForm({
  initialValues: { email: 'a@b.com' },
  validateFirst: true,       // stop at first failing field on validate
  // pattern/display shortcuts: editable, disabled, readPretty, visible, hidden
})
```

Options (`IFormProps` in `core/src/types.ts`), all optional:

- `values` / `initialValues` — seed the form data (`values` is cloned via `structuredClone`).
- `pattern` — `'editable' | 'disabled' | 'readPretty'`; or the boolean shortcuts
  `editable`, `disabled`, `readPretty` (setting a boolean writes the pattern).
- `display` — `'visible' | 'none' | 'hidden'`; or booleans `visible`, `hidden`.
- `validateFirst?: boolean` — fail-fast validation.
- `effects?: (form) => void` — register lifecycle effects; advanced.

`createForm()` with no args is fine: `new Form({})`.

The form is a **MobX-observable model** (values, pattern, display, submitting, errors, … are all
observable). In React you read it through the provider + `observer`-wrapped components (details in
the reactivity reference). It is NOT a React state object — do not `useState` it.

---

## 3. FormProvider lifecycle — who mounts/unmounts the form

`FormProvider` is the only place that drives form lifecycle (`react/src/FormContext.tsx`):

```tsx
const FormProvider: React.FC<IProviderProps> = (props) => {
  React.useEffect(() => {
    props.form.onMount()                 // ON_FORM_MOUNT
    return () => props.form.onUnmount()  // ON_FORM_UNMOUNT
  }, [props.form])
  return <FormContext.Provider value={props.form}>{props.children}</FormContext.Provider>
}
```

Mapping:

- **Provider mounts** → `form.onMount()` fires `ON_FORM_MOUNT` and sets `mounted = true`.
- **Provider unmounts** (or `form` prop identity changes) → `form.onUnmount()`:
  destroys **all registered fields** (`form.query('*').forEach(f => f.destroy(false))`),
  disposes the internal `values`/`initialValues` reactions, removes effects, sets `unmounted = true`.
- **Fields are mounted/unmounted by the field components themselves** (`createFieldHelper` calls
  `field.onMount()` after creating the model; the field's cleanup calls `field.onUnmount()`).
  You never call `onMount`/`onUnmount` by hand.

Consequences you must design around:

- Lifecycle is tied to the **identity** of `props.form`. If you pass a *new* form object on every
  render, the provider unmounts and remounts a fresh form every render — losing all field state
  and values. See §4.
- A form that was unmounted cannot be remounted the same way: `onUnmount` is terminal
  (`_self.unmounted = true`). Do not "reuse" a dead form — create a new one.
- In React 18/19 StrictMode, effects run mount → unmount → mount in dev; the form (and fields)
  will see `onMount`/`onUnmount` twice. That is harmless as long as the **same stable form
  instance** is used and your `effects` handlers are idempotent-ish (registering effects happens
  in the `Form` constructor, not in React effects, so they survive the double-invoke).

---

## 4. Stable form identity — `useMemo`, and why unstable `createForm` is dangerous

**Canonical pattern (from `apps/examples/src/routes/layout.tsx`):**

```tsx
import React from 'react'
import { createForm } from '@astro-form/core'
import { FormProvider } from '@astro-form/react'

export default function Layout() {
  const form = React.useMemo(() => createForm(), [])
  return (
    <FormProvider form={form}>
      <MyFormPage />
    </FormProvider>
  )
}
```

`createForm()` allocates a brand-new `Form` instance **every call**. Passing a fresh instance
each render is an anti-pattern with two compounding failure modes (both confirmed in source):

1. **FormProvider remount** — its effect deps are `[props.form]`, so a new identity runs
   `onUnmount` (destroys every field, disposes reactions, wipes `fields`) then `onMount` on a
   new, **empty** form. All entered values, feedbacks and validators are gone.
2. **Field remount** — `BaseField`'s mount effect includes the form in its deps (see the design
   note in `react/src/Field.tsx`; historically omitted, now included so provider form swaps are
   handled). A new form identity therefore tears down and re-registers **every field** in the
   tree, remounting each field model (`ref.current.onUnmount()` → recreate). This is wasted work
   and can produce visual flicker / dropped state even when values happen to survive.

Worse, "works by accident" cases: if your values *are* re-seeded via `initialValues` each render,
the data loss is masked, which makes the bug harder to spot while still re-mounting the whole
field graph on every keystroke/render.

Rules of thumb:

- Create the form **once per page/component lifetime**: `useMemo(() => createForm(), [])`.
- Module-scope singletons (`const form = createForm()`) are fine for app-wide forms.
- Only pass a *new* form when the page genuinely swaps forms (e.g. edit different records).
- If you need the form inside `FormProvider`'s own children, read it back with `useForm()` —
  don't create a second instance.

---

## 5. Minimal working page skeleton

A complete, copy-pasteable page (React 18/19 + TS). Public API only:

```tsx
import React from 'react'
import { createForm } from '@astro-form/core'
import { FormProvider, f, useForm, observer } from '@astro-form/react'

// Field-level React component — wrap in observer() to re-render when the
// observable field/form state changes.
const EmailField = observer(() => {
  const form = useForm()
  return (
    <div>
      <f.String
        name="email"                 // required; path = basePath + name
        as="input"
        x-required                   // validator rule under x-*
        v-maxLength={64}             // validator rule under v-*
        placeholder="you@example.com"
      />
      <button type="button" onClick={() => form.clearErrors('email')}>
        Clear errors
      </button>
    </div>
  )
})

export default function ContactPage() {
  // Stable form identity — never createForm() inline per render (see §4).
  const form = React.useMemo(
    () => createForm({ initialValues: { email: '' } }),
    []
  )

  const handleSubmit = async () => {
    try {
      // Submit = validate('*') first; runs the callback only when valid,
      // and returns its result (the callback receives the values).
      await form.submit((values) => {
        console.log('valid submit', values)
        // ... POST to your backend
      })
    } catch (errors) {
      // form.invalid === true; errors === form.errors (array of feedbacks)
      console.error('invalid', errors)
    }
  }

  return (
    <FormProvider form={form}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        <EmailField />
        <button type="submit">Submit</button>
      </form>
      <p>{form.values.email}</p>   {/* observable: re-renders when typed (inside observer) */}
    </FormProvider>
  )
}
```

Key points in the skeleton:

- **`name` is required** on every field; the field's path is `basePath + name` (basePath is `''`
  at the top level — see the nesting/FieldProvider reference for nested forms).
- **`as="input"`** renders a real element and injects `value` / `onChange` / `onFocus` /
  `onBlur` (+ `pattern`, plus any passthrough props like `placeholder`). `onChange` first calls
  `field.onInput(...)` (writes the value into the form model) then your own `onChange`.
  Without `as` **or** `children`, the field renders nothing (it only renders `componentProps.children`).
- **Directives**: `x-required` and `v-maxLength` are validators; `x-initialValue`,
  `x-display`, … are field-model props. Routing rules are covered in the directives reference —
  at scaffold time just remember: `x-*` = field props except validator keys (like `required`,
  `maxLength`) which route to validators; `v-*` = validator namespace. Public API is `x-*` / `v-*` only.
- **`form.submit(onSubmit?)`** validates all fields first (`batchValidate`), then throws
  `form.errors` when invalid; when valid it calls `onSubmit(values)` (or, with no callback,
  returns `toJS(form.values)`). Use it inside your own `onSubmit` handler. `submit` returns
  `Promise<T>`; the callback form gives you typed values (`ValueType`).
- **`observer`** (re-exported from `mobx-react-lite` via `@astro-form/react`) wraps components
  that read observable form/field state so they re-render on change. Without it, typing in the
  field updates the model but the component may not re-render.

---

## 6. Tooling

You need **only** standard JSX + TypeScript tooling (Vite, Next, webpack, tsc, …) plus the
`@astro-form/react` and `@astro-form/core` packages. No special form-file toolchain is required.

---

## Source map (for verification)

| Topic | Evidence |
|---|---|
| Exports / re-exports | `packages/react/src/index.ts` |
| `FormProvider` effect + `useForm` | `packages/react/src/FormContext.tsx` |
| `createForm` | `packages/core/src/shared/externals.ts` |
| `IFormProps` options | `packages/core/src/types.ts` |
| `Form.onMount/onUnmount`, `submit`, `reset` | `packages/core/src/models/Form.ts` |
| Field mount/remount + form-dep note | `packages/react/src/Field.tsx` |
| Directive extraction (`x-*`/`v-*` matrix) | `packages/react/src/utils/extract-field-props.ts` |
| Canonical scaffold (`useMemo(createForm, [])`) | `apps/examples/src/routes/layout.tsx` |
| Peer dep `react >= 18` | `packages/react/package.json` |

## Open questions

- Registry availability of `@astro-form/react@0.1.0` / `@astro-form/core@0.1.0` on npm (see §1).
- Whether `form.submit()`'s reject-on-invalid behavior (`throw this.errors`) should be treated as
  the primary documented submit contract for agents, or whether `form.on('onFormSubmitFailed', …)`
  is preferred — the reference above uses the async/throw style as the simplest correct path.
