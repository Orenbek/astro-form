# 05 — Custom controls, refs, pitfalls

Public API. Evidence: `Field.tsx`, `map-field-to-component-props.ts`, `extract-field-props.ts`, `hooks/useRef.ts`, core `Field` / `getValuesFromEvent`.

SKILL covers the global render contract; this file is the deep dive for custom hosts and failure modes.

## 1. `as` contract

```ts
{ ...field.componentProps, ...mapFieldToComponentProps(field), onChange, onFocus, onBlur, ref }
```

| Prop | Source |
|---|---|
| `value` / `checked` | Model (checkbox when `componentProps.type === 'checkbox'`) |
| `disabled` / `readOnly` | `field.disabled` / `field.readPretty` (inherited pattern) |
| `onChange` / `onFocus` / `onBlur` | Model write/triggers **then** user handlers |
| `ref` | React → DOM/host (not `x-ref`) |
| other | Passthrough |

Does **not** pass form `pattern` as HTML `pattern` (regex attr).

```tsx
function TextInput({ value, onChange, onFocus, onBlur, disabled, readOnly, placeholder }: any) {
  return (
    <input value={value ?? ''} placeholder={placeholder} disabled={disabled} readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} />
  )
}
```

Mode via `x-disabled` / `x-readPretty`; regex via `v-pattern`.

## 2. Events

```ts
// getValuesFromEvent: type === 'checkbox' → checked; else value; plain args as-is
```

- Prefer **plain values** (`onChange('x')`, `onChange(true)`).
- HTML events only if `target === currentTarget` — **bubbled events are dropped**.
- Model updates **before** your `onChange`.
- Rules default `triggerType: 'onInput'`; use `x-validator` + `triggerType: 'onBlur'` for blur.

```tsx
// Number — parse yourself
onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}

// Custom switch without type=checkbox on the field host may receive `value` not `checked`
// — either set type="checkbox" on the host props or accept `value` as the boolean.
```

Inline errors are **not** on `as` props — `observer` + `useField` / `x-ref` / `form.query` (ref 04).

## 3. Stable passthrough

`componentProps` sync uses `shallowEqualRecord` (`Object.is` per key). New function/object identity every parent render rewrites the model UI bag → extra `FieldRender` work. Use `useCallback` / `useMemo` for handlers and non-primitives.

## 4. `x-ref` (Field box, not DOM)

```tsx
import { useRef, f, observer } from '@astro-form/react' // package useRef

const emailBox = useRef()
<f.String name="email" as={TextInput} x-ref={emailBox} />

const EmailStatus = observer(() => {
  const field = emailBox.get()
  if (!field || field.destroyed) return null
  return <span>{field.selfValid ? '✓' : field.selfErrors[0]}</span>
})
```

| Fact | Detail |
|---|---|
| Type | `observable.box` — `.get()` / `.set()`, not `{ current }` |
| Fill | Mount effect → **null on first render** |
| Cleanup | Field: `onUnmount` + `destroy()`; box **not** cleared |
| Remount | New Field instance at that path |
| Multi | `x-ref={[a, b]}` or `form.query(path).take()` inside `observer` |
| DOM | React `ref` prop only |

Useful reads: `value`, `selfErrors`, `validateStatus`, `disabled`/`readPretty`, `mounted`/`destroyed`. Writes: `setValue` / `form.setValuesIn`.

## 5. Anti-patterns

| # | Don't | Do |
|---|---|---|
| 1 | `createForm()` in render | `useMemo(() => createForm(), [])` |
| 2 | `React.useRef` for `x-ref` | package `useRef` |
| 3 | Treat `x-ref` as DOM | React `ref` for DOM |
| 4 | Unguarded `box.get()` first paint | null-check |
| 5 | Trust box after destroy | `destroyed` / re-query |
| 6 | Inline handlers/objects on `f.*` | `useCallback` / `useMemo` |
| 7 | Uncontrolled custom input | controlled from `value`/`checked` |
| 8 | `onChange` bubbled event | plain value |
| 9 | Bare `disabled` as form SSOT | `x-disabled` |
| 10 | Native number without parse | parse in `as` |
| 11 | `{cond && <Field />}` to keep data | `x-hidden` |
| 12 | Swap pattern prefixes | `v-pattern`=regex; mode=`x-disabled`/`x-readPretty` |
| 13 | Read model without `observer` | wrap reader |
| 14 | Mutate model outside actions | `setValue` / `setValuesIn` |
| 15 | `f.*` outside provider | always under `FormProvider` |
| 16 | Runtime rename `name` for data moves | `ArrayField` methods / stable slots |
| 17 | One box on many fields | one box each or `query` |

## 6. Quick FAQ

- **Blur validation not running?** Default trigger is `onInput` — declare `triggerType: 'onBlur'`.
- **`observer` on custom `as`?** Not for projected props; yes if the control reads model itself.
- **Disabled still receives programmatic `onInput`?** Host `disabled` is UI; skip calls when disabled; `display === 'none'` blocks `setValue`.
- **StrictMode?** Destroy + remount → new field; seeds only from initial values if present. Keep form identity stable.
