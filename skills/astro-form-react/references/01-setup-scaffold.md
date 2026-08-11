# 01 — Install & scaffold

Public API only. Evidence: `packages/react/src/**`, `packages/core/src/models/Form.ts`, `shared/externals.ts`.

## Install

```bash
npm install @astro-form/react @astro-form/core   # published line 0.1.5+
```

| Package | Role |
|---|---|
| `@astro-form/react` | `FormProvider`, `f.*`, hooks, `mapFieldToComponentProps`, `observer` re-export |
| `@astro-form/core` | `createForm`, Form/Field models — import `createForm` from here in apps |

Peer `react >= 18`. Transitive: `mobx`, `mobx-react-lite`, `@formily/validator`. Monorepo uses `workspace:*` on core; published react pins an exact core version.

### Public exports (`packages/react/src/index.ts`)

`FormProvider`, `useForm`, `FormContext`, `BaseField`, `f`, hooks (`useField`, `useRef` = MobX box for `x-ref`, `useFormEffects`, `useMount`, `useForceUpdate`), utils (`mapFieldToComponentProps`, `passRefToChild`, slots), `observer` (+ rest of `mobx-react-lite`), types (`FieldProps`, `ValidatorProps`, …).

## `createForm`

```ts
import { createForm } from '@astro-form/core'

const form = createForm({
  initialValues: { email: 'a@b.com' },
  validateFirst: true,
  // optional: values, pattern/display or editable/disabled/readPretty/visible/hidden, effects
})
```

MobX model — not React state. Read under `observer` / field hosts. Options: `IFormProps` in core `types.ts`.

## FormProvider & form identity

```tsx
React.useEffect(() => {
  props.form.onMount()
  return () => props.form.onUnmount() // destroys all fields (forceClear false), disposes reactions
}, [props.form])
```

- **New form identity every render** → provider + every field remount → empty form. Always:

```tsx
const form = React.useMemo(() => createForm({ initialValues }), [])
// or module-level singleton for app-wide forms
```

- Unmounted form is terminal — create a new instance; don't reuse.
- Field React cleanup is separate: `onUnmount` + `destroy()` (clears that field's values). Prefer `x-hidden` for keep-on-toggle (see SKILL / ref 03).
- StrictMode double-invokes effects: keep form stable; don't gate UI on `form.mounted`.

## Scaffold notes

- Every field needs `name`; path = `basePath + name`.
- `as` → controlled host (model projection + events). No `as` → register-only.
- Directives: `x-*` model, `v-*` validators (see ref 02).
- `form.submit(onSubmit?)` validates then calls handler or rejects with `form.errors`.

Working page pattern is in the skill quickstart. Nested forms / arrays → ref 03; reactivity → ref 04.
