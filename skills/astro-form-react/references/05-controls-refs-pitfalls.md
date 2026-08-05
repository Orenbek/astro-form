# 05 — Custom controls (`as`), refs, pitfalls

> Audience: coding agents building React forms with `@astro-form/react`.
> Public API only — `x-*` / `v-*` directives and normal React props.
>
> Source evidence: `packages/react/src/Field.tsx`, `packages/react/src/types.ts`,
> `packages/react/src/utils/extract-field-props.ts`, `packages/react/src/utils/pass-ref-to-child.ts`,
> `packages/react/src/hooks/useRef.ts`, `packages/core/src/models/Field.ts`,
> `packages/core/src/models/BaseField.ts`, `packages/core/src/shared/internals.ts`.

**TL;DR**

- `as` is the render contract: your component receives `value`, `onChange`, `onFocus`, `onBlur`,
  `pattern`, the React `ref`, plus every non-directive prop you pass to `f.*` (children included).
- `onChange` writes a **plain value** into the field model, then calls your own `onChange`.
  Never forward a bubbling DOM event — non-self events are silently ignored.
- `x-ref` is **not** a DOM ref. It is a MobX `observable.box` that receives the **core `Field`
  model** after mount (filled in an effect, so `null` on first render).
- The `pattern` prop the control receives is the **field interaction pattern**
  (`'editable' | 'disabled' | 'readPretty'`), not a validation regex. Native elements do **not**
  auto-disable from `x-disabled` — custom controls must honor `pattern`.
- Keep `onChange`/`onFocus`/`onBlur` (and any function/object/array prop) **stable** with
  `useCallback`; inline handlers rewrite the model's UI props on every parent render.

---

## 1. The `as` contract — what your control actually receives

`f.String` / `f.Number` / `f.Boolean` / `f.Object` / `f.Array` all render through the same
`FieldRender` (`react/src/Field.tsx`). When `as` is set, the rendered element/component receives:

```tsx
<f.String name="email" as={MyInput} x-required placeholder="you@example.com" disabled={isDisabled} />
```

| Prop | Source | Meaning for your control |
|---|---|---|
| `value` | `field.value` (observable) | Current model value; changes re-render the control via the observer wrapper. **Always treat the control as controlled.** |
| `onChange(...args)` | wrapper | Calls `field.onInput(...args)` (writes the model) **then** your own `onChange` prop, same args. Pass a **plain value**, see §2. |
| `onFocus(...args)` | wrapper | Marks the field `active`/`visited` and runs `onBlur`-triggered validation; then your `onFocus`. |
| `onBlur(...args)` | wrapper | Clears `active` and runs `onBlur`-triggered validation; then your `onBlur`. |
| `pattern` | `field.pattern` (computed, inherits parents) | `'editable' \| 'disabled' \| 'readPretty'`. **Interaction mode, not a regex.** Your control should map it to disabled/readOnly. |
| `ref` | React ref forwarded from `f.*` | The **DOM node** (or whatever your component forwards). See §5 — this is unrelated to `x-ref`. |
| everything else | passthrough | `placeholder`, `className`, `type`, your own `onChange`, `children`, … — stored on the field model as UI props and spread onto the element. |

`children` passed to `f.*` is forwarded as the element's children (it lives in the passthrough
props). When `as` is **omitted** (typical for `f.Object`/`f.Array`), only `children` render,
wrapped in a `FieldProvider` whose `basePath` is this field's path — nested `f.*` become
children of this field automatically (see the nesting reference).

**Example — minimal controlled input:**

```tsx
import React from 'react'
import { f } from '@astro-form/react'

function TextInput({ value, onChange, onFocus, onBlur, pattern, placeholder }: any) {
  return (
    <input
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} // plain value, NOT the event
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={pattern === 'disabled' || pattern === 'readPretty'}
      readOnly={pattern === 'readPretty'}
    />
  )
}

// usage
<f.String name="email" as={TextInput} x-required x-maxLength={64} placeholder="you@example.com" />
```

### Pattern routing (dual-key trap)

`pattern` is a **dual-key**: it exists in both the field-model set and the validator set, so the
prefix decides the meaning (`react/src/utils/extract-field-props.ts`, tests in
`react/tests/index.test.ts`):

- `x-pattern` → **validator rule** (validation regex, e.g. `x-pattern={/^[a-z]+$/}`).
- `v-pattern` → **field model prop** (interaction mode, e.g. `v-pattern="readPretty"`).
- The `pattern` **prop** your `as` component receives is always the **field** pattern
  (`'editable' | 'disabled' | 'readPretty'`), never your validation regex.

For the common "make it readonly/disabled" case prefer the boolean field props
(`x-readPretty`, `x-disabled`, `x-editable`) — same effect, no prefix confusion.

---

## 2. Event semantics — what `onChange`/`onFocus`/`onBlur` do with your args

`Field.onInput` (`packages/core/src/models/Field.ts`) decides what to store:

```ts
value = args[0].target?.value      // native input event  →  e.target.value
args[0].target?.checked            // (only if value is invalid, see pitfall #9)
args[0]                            // anything else      →  stored as-is
```

**Contract: pass a plain value.** `onChange('abc')`, `onChange(42)`, `onChange(true)`,
`onChange({ a: 1 })` all store the value directly.

**Events are only accepted from the control itself.** `onInput` checks that an event-bearing
first argument is an HTML input event whose `target === currentTarget`
(`isHTMLInputEventFromSelf` in `shared/internals.ts`). Consequences:

- Your control's own `<input>` synthetic event works: `onChange(e)` where `e` came from the
  inner input you rendered (target === currentTarget) → value extracted from `e.target.value`.
- A **bubbled** event (some deeper element, or an event whose `target !== currentTarget`) is
  **silently dropped** — no write, no error. This is why the safest pattern is
  `onChange(e.target.value)` instead of `onChange(e)`.
- `onFocus()` / `onBlur()` with **no args** are fine. If you pass an event-like object whose
  `target` lacks `value`/`checked`, the focus/blur handling is skipped (no state change, no
  validation) — keep passing no-arg or plain-value args. (`stopPropagation` is only called in
  the `onInput` path, not for focus/blur.)

Ordering guarantee: the model write happens **before** your own `onChange` runs (the wrapper
calls `field.onInput(...)` first), so inside your handler `field.value` is already updated.

**Validation triggers** (see `validateSelf`): on every `onInput` the field validates rules whose
`triggerType` matches. Rules default to `triggerType: 'onInput'` (`@formily/validator` parser),
so `x-required`, `x-pattern`, `v-maxLength`, … run while typing. `onFocus`/`onBlur` only run
rules explicitly declared with that trigger:

```tsx
<f.String
  name="code"
  as={TextInput}
  x-validator={[{ required: true, triggerType: 'onBlur' }]}
/>
```

### Custom control examples

**Checkbox / switch** (`f.Boolean`) — must read `e.target.checked`:

```tsx
function Checkbox({ value, onChange, pattern }: any) {
  return (
    <input
      type="checkbox"
      checked={!!value}
      disabled={pattern !== 'editable'}
      onChange={(e) => onChange(e.target.checked)} // checked, not e.target.value
    />
  )
}
<f.Boolean name="agree" as={Checkbox} x-required />
```

**Number input** (`f.Number`) — the model does **not** coerce strings; parse yourself:

```tsx
function NumberInput({ value, onChange, ...rest }: any) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      {...rest}
    />
  )
}
<f.Number name="age" as={NumberInput} x-minimum={0} />
```

**Showing validation errors next to a control** — errors are **not** part of the `as` props;
read them from the field model in an `observer` (re-exported from `mobx-react-lite`):

```tsx
import { observer, useForm, f } from '@astro-form/react'

const EmailErrors = observer(() => {
  const form = useForm()
  const field = form.query('email').take() // GeneralField | undefined
  if (!field || !field.selfErrors.length) return null
  return <p className="error">{field.selfErrors.join('; ')}</p>
})

// usage
<f.String name="email" as={TextInput} x-required />
<EmailErrors />
```

`observer` is required here because the component reads observable model state
(`form.fields`, `field.feedbacks`). The `as` control itself does **not** need `observer` —
`FieldRender` (an observer) re-renders it with a fresh `value`/`pattern` on every model change.

---

## 3. Stable callbacks vs inline handlers

Every render, `BaseField` re-extracts props into fresh bags
(`extractFieldPropsAndComponentProps` always allocates new objects), then a sync effect diffs the
**passthrough UI props** against the model's current `componentProps` using
`shallowEqualRecord` (per-key `Object.is`) and only writes when something **by value** changed
(`react/src/Field.tsx` + `react/src/utils/shallow-equal.ts`).

- **Stable props** (`useCallback` handlers, string/number literals, memoized objects): the guard
  passes → no model write, no extra render. Parent re-renders are cheap no-ops.
- **Inline handlers / inline objects & arrays** (new identity every render): the guard fails →
  the model's UI props (`componentProps`) are **rewritten on every parent render**, which
  triggers a `FieldRender` re-render (it spreads those props) and observable churn.

It is not an infinite loop (the write does not re-render `BaseField` itself), but it is wasted
model mutation + rendering on every keystroke/render. **Prefer `useCallback`** for
`onChange`/`onFocus`/`onBlur` and memoize any object/array/function you pass through:

```tsx
const ContactForm = () => {
  const handleChange = React.useCallback((value: string) => {
    console.log('typed', value) // runs AFTER the model write
  }, [])
  const handleBlur = React.useCallback(() => {
    analytics.track('blur')
  }, [])

  return (
    <f.String
      name="email"
      as={TextInput}
      x-required
      onChange={handleChange}
      onBlur={handleBlur}
    />
  )
}
```

If your handler depends on changing props, keep it stable and read the latest values inside via
a ref or `useCallback(dep)` — standard React practice.

---

## 4. `x-ref` — the field instance box (NOT a DOM ref)

`x-ref` hands you the **core `Field` model** (the MobX-observable field instance), not an element.

```tsx
import { useRef, f } from '@astro-form/react' // package useRef, NOT React.useRef

const emailBox = useRef() // IObservableValue<Field | null> — a MobX observable.box

<f.String name="email" as={TextInput} x-ref={emailBox} />
```

Mechanics (evidence: `react/src/hooks/useRef.ts`, mount effect in `react/src/Field.tsx`):

- `useRef()` from `@astro-form/react` returns `observable.box(null, { deep: false })` —
  a **MobX box**, with `.get()`, `.set()`, `.observe()`. It is stable across renders.
- The box is filled **in an effect after mount** (or re-mount): `box.set(fieldModel)`.
  ⇒ **`box.get()` is `null` during the first render.** Guard or read in an effect.
- The box is re-filled when the field is recreated — i.e. when `name`, `basePath`, or the
  **form** instance changes (those are the mount-effect deps). All consumers see the new field.
- The box is **never cleared** on unmount (cleanup only calls `field.onUnmount()`). After
  unmount the box still holds the field; check `field.mounted` / `field.destroyed` or re-query
  the form instead.
- The box is **overwritten** when the same field re-mounts (fields are re-used by path:
  `createField` returns the existing instance), so identity is stable across
  unmount/remount as long as the path and form are unchanged.

**Reading the model:**

```tsx
import { observer, useRef, f } from '@astro-form/react'

const emailBox = useRef()

// inside an observer component — reads are reactive
const EmailStatus = observer(() => {
  const field = emailBox.get()
  if (!field) return null            // first render: still null
  return <span>{field.valid ? '✓' : '✗'} {field.selfErrors.join(', ')}</span>
})
```

Useful model members for controls/labels: `value`, `initialValue`, `inputValue` (raw last
input), `selfErrors`/`errors`, `validateStatus`, `valid`/`invalid`, `active`/`visited`,
`required`, `pattern`/`display`/`disabled`/`readPretty`/`editable`/`hidden`/`visible`,
`selfModified`, `mounted`, `destroyed`. Prefer the setter API for writes:
`field.setValue(v)` / `field.setInitialValue(v)` / `form.setValuesIn(path, v)`.

**React `ref` is the other one** — `<f.String as="input" ref={inputRef} />` forwards through
`f.String → BaseField → FieldRender` to the rendered element, so `inputRef.current` is the DOM
node (React 19: your custom `as` component receives it as `props.ref`; React 18: wrap with
`forwardRef` and forward it). `x-ref` and `ref` never collide — `x-ref` is just a normal prop.

---

## 5. Multi-consumer ref patterns (pure React terms)

Several places may need the same `Field` instance (a control, its label, an error display, a
sibling effect). Options, in order of preference for hand-written React:

**a) `x-ref` accepts an array of boxes** — all of them are written on mount
(`x-ref` type: `IObservableValue<Field | null> | Array<IObservableValue<Field | null>>`):

```tsx
const controlBox = useRef()
const labelBox = useRef()
const errorsBox = useRef()

<f.String name="email" as={TextInput} x-ref={[controlBox, labelBox, errorsBox]} />
```

Array identity per render is fine — the boxes are written once by the mount effect.

**b) Query the form by path on demand** (usually the simplest in hand-written React):

```tsx
const field = form.query('email').take() // undefined until the field mounts
```

Combine with `observer` to stay reactive. This is the recommended pure-React path — no box
plumbing needed when the path is known statically.

**c) Share via React context** — put the box in a context created next to the field and consume
it in label/error components (standard React; no library involvement).

(`passRefToChild` is an advanced helper for merging refs onto children. In ordinary React forms,
arrays of boxes (a) or `form.query` (b) cover multi-consumer needs.)

---

## 6. Anti-patterns list

| # | Anti-pattern | Why it breaks | Instead |
|---|---|---|---|
| 1 | `createForm()` in the render body (new instance every render) | Mount-effect deps include the form: every render unmounts/remounts **every** field and rewrites every `x-ref` box; values/feedbacks lost | `useMemo(() => createForm(), [])` (see 01-setup-scaffold §4) |
| 2 | `React.useRef` for `x-ref` (plain `{ current }` object) | The mount effect calls `box.set(field)` — a plain ref has no `.set` → runtime crash | `import { useRef } from '@astro-form/react'` (alias it if you also need React's) |
| 3 | Expecting `x-ref.current` to be a DOM node | `x-ref` is the **Field model**, filled post-mount | Use the React `ref` prop for DOM access; `x-ref` for model access |
| 4 | `box.get()` dereferenced during first render | Box is filled in an effect → `null` on first render | Null-guard, or read in an effect/`observer` after mount |
| 5 | Relying on a box after field/form unmount | Box is never cleared; the field is unmounted/destroyed (`mounted === false`, `destroyed === true`) | Check `field.mounted`/`field.destroyed`, or `form.query(path).take()` on demand |
| 6 | Inline `onChange`/`onFocus`/`onBlur` or inline objects/arrays passed to `f.*` | Identity differs per render → model UI props rewritten every render → `FieldRender` re-renders (see §3) | `useCallback` / `useMemo` for anything non-primitive |
| 7 | Custom control ignores `value` (uncontrolled internal state) | UI desyncs from the model; `x-initialValue`, `reset()`, `form.setValuesIn` never reflect | Render from `value`; write through `onChange` |
| 8 | Custom control calls `onChange(e)` with a bubbled/non-self DOM event | Self-event guard silently drops it — no write, no error | `onChange(e.target.value)` / `onChange(parsedValue)` |
| 9 | `f.Boolean` + native `as="input" type="checkbox"` | `onInput` reads `e.target.value` **before** `e.target.checked`, so the stored value is the checkbox's value attribute (usually `"on"`), never the checked state | Custom control calling `onChange(e.target.checked)` (see §2) |
| 10 | `f.Number` + native `as="input" type="number"` | Native `value` is a string; the model stores strings (no coercion) | Parse in the control (`Number(...)`) or keep strings + `x-pattern` |
| 11 | Expecting `x-disabled`/`x-readPretty`/form pattern to disable a native input | The element only receives `pattern` (`'disabled'`/`'readPretty'`); native inputs don't act on it | Custom control honoring `pattern` (disabled/readOnly), or pass `disabled` explicitly |
| 12 | `x-pattern` to set the field pattern, or `v-pattern` for a validation regex | Dual-key routing: `x-pattern` → validator; `v-pattern` → field model (see §1) | `x-pattern` for regex; `v-pattern`/`x-disabled`/`x-readPretty` for interaction mode |
| 13 | Reading model state (`box.get().value`, `form.values…`) in a plain (non-`observer`) component | Reads are reactive only inside `observer` — the UI won't re-render on change | Wrap the reader in `observer` |
| 14 | Direct model mutation in async callbacks (e.g. `field.value = x`) | Bypasses actions; with mobx strict settings it throws; always surprising | `field.setValue` / `form.setValuesIn` / `runInAction` |
| 15 | Rendering `f.*` outside `FormProvider` | `useForm()` returns `null` → crash while creating the field | Always render fields under `FormProvider` |
| 16 | Renaming a field at runtime (changing `name`) | The old path stays registered with its values (leaks into `form.values`/`submit`); renaming back reuses the stale field | Keep `name` stable per slot, or explicitly clean up/reset on move |
| 17 | Same box on several fields | Last-mounted field wins; earlier fields overwrite the same box | One box per field, or an array of boxes, or `form.query(path)` |

---

## 7. FAQ / troubleshooting

**Q: `box.get()` is `null` on first render — is that expected?**
Yes. The box is filled in the field's mount effect (after first commit). Guard with
`if (!field) return null`, or read it in an effect.

**Q: How do I get the DOM node of a field's control?**
React ref: `<f.String as="input" ref={inputRef} />`. The ref forwards through to the rendered
element. For a custom `as` component: React 19 gives it to you as `props.ref`; React 18 requires
`forwardRef` on the component.

**Q: What's the difference between `ref` and `x-ref`?**
`ref` = React ref → DOM node of the rendered control. `x-ref` = MobX box → the core **Field
model** (value, errors, pattern, validators…). Same element, two different refs on purpose.

**Q: My custom control's `onChange` doesn't update the form.**
Check, in order: (1) you're inside `FormProvider`; (2) you pass a **plain value** (not a bubbled
event — self-event guard drops it); (3) the field's display isn't `'none'` (`setValue` silently
returns for `display === 'none'`); (4) you're not relying on `x-value` (not part of the public
API — use `x-initialValue` or `form.setValuesIn`).

**Q: Why doesn't blur validation run for my `x-required` rule?**
Rules default to `triggerType: 'onInput'`; blur/focus validation only runs rules declared with
`triggerType: 'onBlur'` / `'onFocus'` (see §2).

**Q: Do I need `observer` on my custom `as` control?**
Not for `value`/`pattern` — `FieldRender` is an observer and re-renders your control with fresh
props. Yes, if the control (or a sibling) reads model state directly (e.g. `field.selfErrors`,
`form.values`) — those reads are only reactive inside `observer`.

**Q: I set `x-required` but `f.Boolean` checkbox stores `"on"`.**
That's the native-checkbox value trap (anti-pattern #9). Use a custom control that calls
`onChange(e.target.checked)`.

**Q: Does unmounting/remounting a field reset it?**
No. The field model persists in the form (mounted toggles only); values survive. The `x-ref`
box keeps the same instance. Reset explicitly (`form.reset('path')` / `field.reset()`) if you
need a fresh field.

**Q: Why does my disabled field still accept `onChange` writes?**
`pattern` blocks **validation** and UI affordances only when the control honors it — the model
itself does not reject `onInput` writes for non-editable fields. Make your control skip
`onChange` when `pattern !== 'editable'` (or rely on `display` which does block writes).

**Q: StrictMode double-invokes effects — do I need to do anything?**
No. `createField` is idempotent by path: the second mount re-uses the same field instance, the
box is written twice with the same value, values survive. The real StrictMode killer is
**unstable form identity** (anti-pattern #1), not field-level double-effects.

---

## Source map (for verification)

| Topic | Evidence |
|---|---|
| `as` render contract (value/onChange/onFocus/onBlur/pattern spread) | `packages/react/src/Field.tsx` (`FieldRender`) |
| Prefix routing for `pattern`/`required`/… (x- vs v-) | `packages/react/src/utils/extract-field-props.ts` + `react/tests/index.test.ts` |
| `x-ref` public type (box or array of boxes) | `packages/react/src/types.ts` (`HyphenFieldProps`) |
| Box lifecycle (filled in mount effect, never cleared) | `packages/react/src/Field.tsx` mount effect |
| `useRef` = `observable.box` | `packages/react/src/hooks/useRef.ts` |
| Event/value extraction + self-event guard + validation triggers | `packages/core/src/models/Field.ts` (`onInput`/`onFocus`/`onBlur`), `packages/core/src/shared/internals.ts` (`getValuesFromEvent`, `isHTMLInputEvent`, `isHTMLInputEventFromSelf`, `validateSelf`) |
| Rule trigger default `'onInput'` | `@formily/validator` `esm/parser.js` (`triggerType ?? 'onInput'`) |
| UI-props diff guard (shallow-equal) | `packages/react/src/Field.tsx` + `react/src/utils/shallow-equal.ts` |
| Field model surface for controls (value/errors/pattern/…) | `packages/core/src/models/BaseField.ts`, `Field.ts` |
| `form.query(path).take()` | `packages/core/src/models/Query.ts` |
| Multi-ref merge helper | `packages/react/src/utils/pass-ref-to-child.ts` |

## Open questions

- Whether storing the checkbox `value` attribute (instead of `checked`) for native
  `as="input" type="checkbox"` is intentional (anti-pattern #9) — currently the safe documented
  path is a custom checkbox control.
- Whether `f.Number` should coerce `type="number"` strings internally; today it does not
  (anti-pattern #10), so number handling is the control's responsibility.
- `x-value` works at runtime (routed to the field factory on first mount) but is **not** on the
  public type surface and is never re-synced after mount — unclear whether it should be
  documented as a supported way to seed values (prefer `x-initialValue`).
