# 02 — Fields & Directives

> Reference for `@astro-form/react`. Everything below is **public API**: `f.*` field components,
> `x-*` / `v-*` hyphen directives, and plain React props.
>
> Source of truth: `packages/react/src/Field.tsx`, `packages/react/src/utils/extract-field-props.ts`,
> `packages/react/src/types.ts`, `packages/core/src/models/{BaseField,Field,ObjectField,ArrayField}.ts`,
> `@formily/validator` (rules/triggers/formats).

---

## 1. Field components

`f` is the exported factory object (`import { f } from '@astro-form/react'`). Each member is a React
forward-ref component that creates a **core field model** registered on the nearest `FormProvider`
form, and renders a UI control bound to it.

| Component | Core model | Value default | Notes |
|---|---|---|---|
| `f.String` | `Field` | `undefined` | Free-form text / any scalar |
| `f.Number` | `Field` | `undefined` | No auto-coercion (see §8) |
| `f.Boolean` | `Field` | `undefined` | No auto-coercion (see §8) |
| `f.Object` | `ObjectField` | `{}` | Nesting container; children join path |
| `f.Array` | `ArrayField` | `[]` | Item container; children join path |

All five accept the **same prop shape** (`FieldProps`): `name`, `as`, `children`, `x-*` field
directives, `v-*` / `x-*` validator directives, plus arbitrary passthrough UI props.

### The three core props

- **`name: string`** — required. The field's path segment relative to its `basePath`
  (a parent `f.Object` / `f.Array` / explicit `x-basePath`, else `''`). Final path is
  `FormPath.parse(basePath).concat(name)`. Dot and bracket syntax both work:
  - `name="city"` at top level → `city`
  - `name="address.city"` under object → `address.city`
  - `name="0.title"` or `name="[0].title"` inside an array → `items.0.title`
  - Field **identity** is this final path: two fields with the same path share one core model
    (re-creating the same `name` returns the existing field).
- **`as?: string | React.FC<any>`** — what to render: a DOM tag (`"input"`, `"select"`, `"div"`, …)
  or a React component. The field injects `value` / `onChange` / `onFocus` / `onBlur` + passthrough
  props into it (see §6). If omitted, **no element is rendered** — only `children` (used to build
  nesting containers without UI).
- **`children?: React.ReactNode`** — rendered inside the `as` element. For `f.Object` / `f.Array`,
  children are wrapped in a `FieldProvider` whose `basePath` is this field's path, so nested
  `f.*` fields' `name` are joined under it automatically.

```tsx
// Top-level string field bound to <input>
<f.String name="email" as="input" x-initialValue="a@b.com" x-required v-format="email" placeholder="Email" />

// Object nesting — children join the path automatically
<f.Object name="user" as="fieldset">
  <legend>User</legend>
  <f.String name="name" as="input" x-required />
  <f.String name="address.city" as="input" />   {/* -> user.address.city */}
</f.Object>
```

---

## 2. Directive routing — the `x-*` / `v-*` matrix

At mount, `BaseField` splits every prop into three buckets
(`extractFieldPropsAndComponentProps`): **field-model props**, **validator rules**, and **UI
passthrough**. Routing is decided by the **key prefix**:

| Prop prefix | Routed to | Rule |
|---|---|---|
| `x-*` | **Validator** if suffix is a known validator key, **else field-model** | validator-first |
| `v-*` | **Field-model** if suffix is a known field key, **else validator** | field-first |
| `name`, `as` | Field-model (special, no prefix) | — |
| anything else (`placeholder`, `className`, `onClick`, …) | **Passthrough** → `as` component props | UI bucket |

Two keys — `required` and `pattern` — exist in **both** dictionaries, so their meaning depends on
the prefix (see §4).

> Prefix must be a **hyphen**: `x-required`, `v-maxLength`. Colon attributes (`x:required`,
> `v:format`) are **not** routed — they fall through to the UI passthrough bucket and are
> silently ignored by the model. Always use hyphens.

### kebab-case vs camelCase after the prefix

The suffix after `x-` / `v-` is normalized with `camelCase` **only when it contains a hyphen**;
already-camelCase suffixes pass through untouched. Either spelling works:

```tsx
<f.String name="a" as="input" x-initial-value="x" />   {/* -> x-initialValue */}
<f.String name="b" as="input" x-initialValue="y" />    {/* -> x-initialValue */}
<f.String name="c" as="input" v-max-length={10} />     {/* -> v-maxLength */}
<f.String name="d" as="input" v-maxLength={10} />      {/* -> v-maxLength */}
<f.String name="e" as="input" x-read-pretty />         {/* -> x-readPretty */}
```

The special internal mappings `x-ref` → the field-box ref and `x-valueType` → value type are also
handled in the field bucket.

---

## 3. Field-model keys (go to the field model)

Acceptable under `x-*` (validator keys routed away) **and** `v-*` (field keys routed here). Values
are written onto the core field when they change.

| Directive | Type | Effect on model |
|---|---|---|
| `x-initialValue` / `v-initialValue` | `any` | Seeds `form.initialValues` and, if no value yet, `form.values` at that path. Reacts to changes (field re-seeds). |
| `x-display` / `v-display` | `'visible' \| 'hidden' \| 'none'` | Display state. `'none'` also **deletes** the value subtree; `'hidden'`/`'none'` clear error feedback. Inherited from parents. **Not `'visible'` ⇒ children render nothing** (see §8). |
| `x-hidden` / `v-hidden` | `boolean` | `true` → display `'hidden'`, `false` → `'visible'`. |
| `x-visible` / `v-visible` | `boolean` | `true` → display `'visible'`, `false` → display `'none'` (value deleted). |
| `v-pattern` | `'editable' \| 'disabled' \| 'readPretty'` | **Interaction mode** (see dual key in §4). Non-editable ⇒ validation skipped, error feedback cleared. Inherited from parents. |
| `x-pattern` | `RegExp \| string` | **Validation regex** — under `x-` the same suffix routes to the validator bucket (dual key, §4). `x-pattern="readPretty"` would be an invalid regex, not a mode. |
| `x-editable` / `v-editable` | `boolean` | `false` → pattern `'readPretty'`. |
| `x-disabled` / `v-disabled` | `boolean` | `true` → pattern `'disabled'` (whole subtree, inherited). |
| `x-readPretty` / `v-readPretty` | `boolean` | `true` → pattern `'readPretty'`. |
| `x-dataSource` / `v-dataSource` | `{ label, value, ... }[]` | Option list for `select`/`radio` style UIs; forwarded to `as` as `dataSource` (passthrough to the control). |
| `x-validator` / `v-validator` | `FieldValidator` | Custom validator description(s) — Formily-style: format string \| function \| rule object \| array thereof. Merged with rule directives. |
| `x-data` / `v-data` | `any` | Arbitrary payload attached to the field model. |
| `x-validateFirst` / `v-validateFirst` | `boolean` | Stop at first failing rule for this field (form-level default via `createForm({ validateFirst })`). |
| `x-reactions` / `v-reactions` | `(field) => void` or array | `autorun` side effects that observe the field/form and can mutate state. |
| `x-basePath` | `string` | **Overrides** the enclosing `FieldProvider` context: `<f.String name="city" x-basePath="address" />` → `address.city`. |
| `x-ref` | `observable.box<Field>` or array of boxes | Not a DOM ref — a MobX box (create with the package's `useRef` hook). Filled with the core `Field` after mount; array = multi-ref merge. See the x-ref reference. |
| `x-plugins` | (runtime-only, untyped) | Class-based field plugins passed to the core factory. |

Runtime-only extras (present in the routing table but **not** on the public `FieldProps` type):
`x-value` seeds the model value at creation (prefer `x-initialValue`), and `x-valueType` is the
internal value-type injector used by `f.*`.

---

## 4. Validator keys — and the dual-key rule

Validator rules are Formily rules stored on `field.validator` and evaluated by
`@formily/validator`. They run automatically on input/focus/blur (see §5). Acceptable under
`v-*` (any key not in the field set) **and** `x-*` (validator-first routing).

```tsx
// v-*: validator namespace
<f.String name="pwd" as="input" type="password" v-required v-minLength={8} v-maxLength={64} />

// x-*: validator keys are also allowed under x- for DX
<f.String name="nick" as="input" x-required x-minLength={2} x-maxLength={20} x-format="email" />
```

Full key list (`ValidatorProps`):

| Key | Type | Meaning |
|---|---|---|
| `format` | `'url' \| 'email' \| 'ipv6' \| 'ipv4' \| 'number' \| 'integer' \| 'idcard' \| 'qq' \| 'phone' \| 'money' \| 'zh' \| 'date' \| 'zip'` (+ registered customs) | Built-in format check |
| `required` | `boolean` | Non-empty (see dual key below) |
| `pattern` | `RegExp \| string` | Regex match (see dual key below) |
| `max` / `maximum` | `number` | ≤ value |
| `min` / `minimum` | `number` | ≥ value |
| `exclusiveMaximum` / `exclusiveMinimum` | `number` | < / > value |
| `maxLength` / `minLength` | `number` | String length bounds |
| `maxItems` / `minItems` | `number` | Array length bounds |
| `maxProperties` / `minProperties` | `number` | Object key-count bounds |
| `len` | `number` | Exact length |
| `whitespace` | `boolean` | Treat whitespace-only as invalid |
| `enum` | `any[]` | Value must be in list |
| `const` | `any` | Value must deep-equal |
| `multipleOf` | `number` | Value divisible by |
| `uniqueItems` | `boolean` | Array items must be unique |

### Dual keys: `required` and `pattern`

These exist in **both** dictionaries — the prefix decides the meaning:

| Directive | Route | Semantics |
|---|---|---|
| `x-required` | **validator** bucket → `validator.required` | "must be filled" validation rule |
| `v-required` | **field** bucket → `field.required` | Same end state: the `required` setter turns it into the `required` validator rule |
| `x-pattern` | **validator** bucket → `validator.pattern` | **Regex** the value must match (a validation rule) |
| `v-pattern` | **field** bucket → `field.pattern` | **Interaction mode**: `'editable' \| 'disabled' \| 'readPretty'` |

```tsx
<f.String name="code" as="input" x-pattern={/^[A-Z]{3}$/} />          // validator regex
<f.String name="code" as="input" v-pattern="readPretty" />            // display-only mode
<f.String name="m" as="input" x-required />                            // validator: required
<f.String name="m" as="input" v-required />                            // field prop: required
```

Practical rule of thumb: write **validators with `x-*`** (`x-required`, `x-pattern`, `x-maxLength`,
…) and **field-model props with `x-*`** too (`x-initialValue`, `x-disabled`, …). Every validator key
also works under `v-*` if you want an explicit validator namespace; the only keys that genuinely
**require** a prefix decision are `required` / `pattern`.

---

## 5. Validation triggers & custom validators

- Handlers are wired automatically: the rendered `as` element receives `onChange`/`onFocus`/`onBlur`
  that (1) update the field and (2) run `validateSelf` with trigger `'onInput'` / `'onFocus'` /
  `'onBlur'`.
- Each rule carries a `triggerType`; **unset rules default to `'onInput'`** (checked in
  `@formily/validator` parser). So `x-required` fires while typing, not on blur, unless you say
  otherwise.
- To validate on blur / focus, declare it inside a custom rule object:

```tsx
const onBlurRequired = [{ required: true, triggerType: 'onBlur' }]

<f.String name="nick" as="input" x-validator={onBlurRequired} />
```

- Custom validator signature (Formily `ValidatorFunction`):
  `(value, rule, ctx, render) => null | string | boolean | { type, message } | Promise<...>`.
  `ctx` carries `{ field, form, value }`. Throwing/`false`/string → error; object with
  `type: 'warning' | 'success'` for those feedback buckets.
- `x-validateFirst` (or `createForm({ validateFirst: true })`) short-circuits after the first
  failing rule.
- Validation is **skipped** when the field is not editable (`pattern !== 'editable'`) or not
  visible — and entering such states clears existing error feedback.

---

## 6. Passthrough props & the `as` contract

Every prop that is not `name` / `as` / `x-*` / `v-*` lands in the UI bucket and is stored on the
model as `componentProps` (accessible as `field.componentProps`). At render, the `as` element gets
props in this exact order:

```ts
{
  pattern: field.pattern,      // interaction mode ('editable'|...)
  ...componentProps,           // your passthrough props + children
  value: field.value,          // ← field owns the value, last-write-wins
  onChange: (e) => { field.onInput(e); userOnChange?.(e) },   // yours still runs, after
  onFocus,                     // same wrap pattern
  onBlur,                      // same wrap pattern
  ref,                         // the ref forwarded through f.*
}
```

Key consequences:

- **Never pass a bare `value`** — the field's value always wins (the control is fully controlled
  by the form model). Seed with `x-initialValue`.
- Your own `onChange` / `onFocus` / `onBlur` are **preserved and run after** the field's internal
  handler, so you can observe or post-process. The event value extraction honors `event.target.value`
  and `event.target.checked`.
- `pattern`, `value`, `onChange`, `onFocus`, `onBlur`, `ref` cannot be meaningfully overridden via
  passthrough (they are injected after the spread). Everything else (`placeholder`, `className`,
  `type`, `disabled` UI-only props, `dataSource`, …) flows straight to `as`.
- The `ref` you pass to `f.*` is forwarded to the `as` element (a DOM/component ref). This is
  **unrelated** to `x-ref`, which captures the core `Field` model.

```tsx
// passthrough + controlled handlers preserved
<f.String
  name="bio"
  as="textarea"
  x-maxLength={200}
  rows={4}
  placeholder="About you"
  onChange={(e) => console.log('user sees:', e.target.value)}
/>
```

---

## 7. Examples per field type

### f.String

```tsx
import { f } from '@astro-form/react'

<f.String name="email" as="input" type="email" x-initialValue="a@b.com"
          x-required v-format="email" v-maxLength={64} placeholder="Email" />
```

### f.Number

```tsx
<f.Number name="age" as="input" type="number" x-required
          v-minimum={0} v-maximum={150} />
// Note: value stays a string from native <input>; coerce in your own onChange or
// use a custom as-control (see §8).
```

### f.Boolean

```tsx
// Native checkbox caveat: it emits its `value` attribute (default "on"), not a boolean.
// Prefer a custom control with a boolean value/onChange contract:
<f.Boolean name="agree" as={MySwitch} x-required />   // MySwitch: value={bool} onChange={bool}
```

### f.Object

```tsx
<f.Object name="user" as="fieldset" x-initialValue={{ name: '', city: '' }}>
  <f.String name="name" as="input" x-required />
  <f.String name="address.city" as="input" />
</f.Object>
// form.values.user → { name, address: { city } }
```

### f.Array

There is no built-in item iteration in the React runtime — map indices yourself inside an
`observer` that reads the array field via a field box (`x-ref`; or `form.query('items').take()`):

```tsx
import { observer, f, useRef as useFieldRef } from '@astro-form/react'  // useRef = MobX observable.box

const fieldRef = useFieldRef()                       // box.get() / box.set(); NOT React.useRef

const Items = observer(() => {
  const items = fieldRef.get()?.value ?? []          // box.get() → Field model; .value → items
  return (
    <f.Array name="items" as="div" x-ref={fieldRef} x-initialValue={[{ title: '' }]}>
      {items.map((_, i) => (
        <f.Object name={`${i}`} as="div" key={i}>
          <f.String name="title" as="input" x-required />
        </f.Object>
      ))}
      <button onClick={() => fieldRef.get()?.push({})}>Add</button>
      <button onClick={() => fieldRef.get()?.remove(0)}>Remove first</button>
    </f.Array>
  )
})
// item i lives at items.{i}.title
```

First-paint note: the box is filled in a mount **effect** (after first commit), so the observer's
first render reads `null` → `[]` → zero rows, then the box fills and items appear — that one-frame
empty pass is expected, don't add local state to "fix" it.

Core `ArrayField` mutations available through the field model: `push`, `pop`, `insert`, `remove`,
`shift`, `unshift`, `move`, `moveUp`, `moveDown` — all reindex child fields and keep values in sync.

---

## 8. Gotchas & open questions

- **No type coercion.** `f.Number` / `f.Boolean` set the model's value *type* (which selects the
  core field class) but never cast incoming values: native `<input>` yields strings, checkboxes
  yield their `value` attribute (default `"on"`). Use a custom `as` control or your own `onChange`
  to coerce. *(Source: `getValuesFromEvent` + `Field.onInput` — confirmed.)*
- **Hidden removes the subtree's DOM, not the data.** When `field.display !== 'visible'`,
  `FieldRender` returns `null`, so `children` — including nested `f.*` React elements — are not
  mounted. But the **field models stay registered** in `form.fields` (unmount only flips
  `mounted=false`, never destroys), and the value semantics differ by display state: `'hidden'`
  **keeps** values, `'none'` **deletes** the value subtree (`setDisplay` → `deleteValuesIn`,
  restored from `initialValue` on re-show). Hidden fields are skipped by validation. So toggling
  a section to `x-display="hidden"` does **not** lose data — for conditional sections prefer
  `x-display`/`x-hidden` over conditional rendering when values must survive.
  *(Source: `Field.tsx` + `BaseField.setDisplay` — confirmed.)*
- **`v-pattern` vs `x-pattern`** is the easiest trap: one sets the regex validator, the other the
  read/disabled mode. `x-pattern` = validate; `v-pattern` = UI mode.
- **Same `name` = same field.** Re-mounting a field with the same path reuses the existing core
  model (it is only marked unmounted, not destroyed). Changing `name`/`basePath` moves the field.
- **Unstable form identity** is a separate lifecycle concern (see lifecycle reference) — always
  `useMemo(() => createForm(), [])`.
- *Open question:* whether `v-required` (field bucket) and `x-required` (validator bucket) produce
  byte-identical validator state in every merge order — source shows both end as the `required`
  rule, but ordering vs. an existing custom `validator` can differ. Use one consistently.
