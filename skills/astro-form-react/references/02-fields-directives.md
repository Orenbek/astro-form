# 02 — Fields & Directives

Public API. Evidence: `Field.tsx`, `utils/extract-field-props.ts`, `types.ts`, core Field models, `@formily/validator`.

Global rules (routing, model→UI, hide vs unmount) live in **SKILL.md** — this file is the key matrices.

## 1. Field components

| Component | Core | Default value | Notes |
|---|---|---|---|
| `f.String` | `Field` | `undefined` | Text / scalars |
| `f.Number` | `Field` | `undefined` | No string→number coercion |
| `f.Boolean` | `Field` | `undefined` | `type="checkbox"` → boolean `checked` |
| `f.Object` | `ObjectField` | `{}` | Nesting; children join path |
| `f.Array` | `ArrayField` | `[]` | Index item names; map in `observer` |

- **`name`** (required): path segment vs `basePath`. Dots/brackets OK (`address.city`, `0.title`). Final path = identity.
- **`as`**: DOM tag or component. Omitted → register-only (children only).
- **`children`**: inside host; for Object/Array, wrapped so nested `f.*` inherit this path as `basePath`.

```tsx
<f.String name="email" as="input" x-initialValue="a@b.com" x-required v-format="email" placeholder="Email" />
<f.Object name="user" as="fieldset">
  <f.String name="name" as="input" x-required />
  <f.String name="address.city" as="input" />
</f.Object>
```

## 2. Routing matrix (strict)

| Prefix | Bucket |
|---|---|
| `x-*` | Field model only |
| `v-*` | Validators only |
| `name`, `as` | Field model |
| other | UI `componentProps` |

Hyphen only (`x-required`). Colon attrs are passthrough noise. Suffix kebab → camel (`x-initial-value` ≡ `x-initialValue`).

## 3. Field-model keys (`x-*`)

Synced on create / change via `useSyncFieldModel`.

| Key | Effect |
|---|---|
| `initialValue` | Seeds initial + value if empty |
| `display` | `visible` \| `hidden` (keep values) \| `none` (delete values) |
| `hidden` / `visible` | Booleans → display |
| `pattern` | Mode: `editable` \| `disabled` \| `readPretty` (not regex) |
| `disabled` / `readPretty` / `editable` | Pattern shortcuts → host `disabled` / `readOnly` |
| `required` | Field flag + installs required rule |
| `validator` | Custom Formily rule(s); merges with `v-*` |
| `validateFirst` | Stop at first failing rule |
| `dataSource` / `data` | Options / arbitrary payload |
| `reactions` | `autorun` side effects — **registered only when the Field is first created** for that path; later prop changes are **not** re-synced (`useSyncFieldModel` skips them). Same-path remount reuses the field → same reactions. Details → **ref 06**. |
| `basePath` | Override inherited basePath |
| `ref` | MobX box(es) for Field model |
| `plugins` | Runtime-only field plugins |

Prefer `x-initialValue` over non-public `x-value`.

## 4. Validator keys (`v-*`)

Default `triggerType: 'onInput'`. Applied via `setValidatorRule`.

| Keys | Role |
|---|---|
| `format` | Built-ins: email, url, … |
| `required` / `pattern` | Non-empty / **regex** |
| `min` `max` `minimum` `maximum` + exclusives | Numeric bounds |
| `minLength` `maxLength` `len` `whitespace` | String |
| `minItems` `maxItems` `uniqueItems` | Array |
| `minProperties` `maxProperties` | Object |
| `enum` `const` `multipleOf` | Membership / equality / step |

### Dual names by prefix

| Directive | Meaning |
|---|---|
| `x-required` | Field + required rule |
| `v-required` | Rule only |
| `x-pattern` | **Interaction mode** |
| `v-pattern` | **Validation regex** |

```tsx
<f.String name="code" as="input" v-pattern={/^[A-Z]{3}$/} />
<f.String name="code" as="input" x-readPretty />  // prefer over x-pattern="readPretty"
```

## 5. Triggers & custom validators

- Host events call `onInput` / `onFocus` / `onBlur` then user handlers; each runs matching rules.
- Blur/focus rules need explicit `triggerType` in `x-validator={[{ required: true, triggerType: 'onBlur' }]}`.
- Custom function: Formily `(value, rule, ctx) => …`; `ctx` has `{ field, form }`.
- Skipped when not editable or not visible; entering those states clears error feedback.

## 6. Host projection (short)

Render: `{…componentProps, …mapFieldToComponentProps(field), onChange, onFocus, onBlur, ref}`.  
Checkbox → `checked`; else `value`; always `disabled`/`readOnly` from pattern. Seed with `x-initialValue`. Full control contract → ref 05.

## 7. Type notes

```tsx
<f.Number name="age" as="input" type="number" x-required v-minimum={0} v-maximum={150} />
// native number input still yields strings unless `as` parses

<f.Boolean name="agree" as="input" type="checkbox" x-required />

// Arrays: observer + package useRef + index paths — see SKILL / ref 03
```
