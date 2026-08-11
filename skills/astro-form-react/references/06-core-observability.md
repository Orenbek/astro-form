# 06 — Form / Field observability (consumer-facing)

How **public** Form and Field properties are observed under the hood, and what that means when you
**read** them from React. Evidence: `packages/core/src/models/Form.ts`, `Field.ts`, `BaseField.ts`.

This is for **using** `form.*` / `field.*` (and directives that write them). Library annotation
choices (`observable` vs `observableRef` vs `observableShallow`) are listed so you know **live
proxy vs snapshot**, not so you re-annotate models yourself.

---

## 1. Annotation legend (MobX 7)

| Annotation | What notifies observers | Nested plain objects |
|---|---|---|
| **`observable` (deep)** | Tree mutations | Become Proxies |
| **`observableShallow`** | Container reference **or** top-level key / index change | Stay plain |
| **`observableRef`** | **Only** replacing the whole value | Untouched |
| **`computed`** | When dependencies change | Depends on what the getter returns |

---

## 2. Form — public surface

Backing store: private `_self` is **deep `observable`**. Several getters are **`computed`** over it.

| Property | Annotation / nature | When you **read** it | Notes for consumers |
|---|---|---|---|
| `values` | computed → live deep tree | **Live Proxy** (deep) | Fine inside `observer`. **Do not mutate in render.** Snapshot: `mobx.toJS(form.values)` or `getValuesIn(path)`. |
| `initialValues` | computed → live deep tree | **Live Proxy** (deep) | Same as `values`. |
| `getValuesIn(path)` | method | **Plain `toJS` snapshot** | Preferred for one path / serialization. |
| `getInitialValuesIn(path)` | method | **Plain `toJS` snapshot** | |
| `errors` / `warnings` / `successes` | computed | Reactive arrays | Empty messages filtered out. |
| `valid` / `invalid` | computed | Reactive booleans | |
| `submitting` / `validating` / `loading` | computed (flags on `_self`) | Reactive booleans | Drive buttons / spinners. |
| `pattern` / `display` / `editable` / `disabled` / `readPretty` / `hidden` / `visible` | computed | Reactive | Inherit-aware where documented. |
| `modified` | `observableRef` | Reactive boolean | User input path; programmatic sets differ. |
| `validateFirst` | `observableRef` | Reactive | |
| `initialized` / `mounted` / `unmounted` | computed | Lifecycle flags | Don't gate UI on these under StrictMode. |
| `fields` | `observableShallow` map | Reactive map of field models | Prefer `form.query(path).take()` for one field. |
| `indexes` | `observableShallow` | Path index map | Internal-ish; rare in app code. |

**Form write APIs** (`setValues`, `setValuesIn`, `setInitialValues`, …) are actions. Strategies for bulk set: `merge` (default) / `shallowMerge` / `overwrite`.

**Submit / validate** handlers receive **`toJS` snapshots**, not live proxies.

---

## 3. Field — public surface

| Property | Annotation / nature | When you **read** it | Notes for consumers |
|---|---|---|---|
| `value` | computed → `form.getValuesIn(path)` | **Plain snapshot every read** | Safe to pass to UI as controlled `value`. **Identity is not stable** across reads. |
| `initialValue` | computed → `form.getInitialValuesIn(path)` | **Plain snapshot** | |
| `selfErrors` / `errors` | computed | Reactive | `self*` = this field only; `errors` includes descendants. |
| `selfWarnings` / `warnings` / `selfSuccesses` / `successes` | computed | Reactive | |
| `selfValid` / `valid` / `selfInvalid` / `invalid` | computed | Reactive | |
| `validateStatus` | computed | `'validating' \| 'error' \| 'warning' \| 'success' \| undefined` | Good for styling / aria. |
| `display` / `pattern` / `hidden` / `visible` / `editable` / `disabled` / `readPretty` | computed | Reactive; inherit parents | Host gets `disabled` / `readOnly` from pattern via React binding. |
| `loading` / `validating` / `submitting` | computed | Reactive | |
| `required` | computed (+ setter installs rule) | Reactive | |
| `active` / `visited` / `selfModified` / `modified` | computed | Reactive | |
| `mounted` / `unmounted` / `destroyed` / `initialized` | computed | Lifecycle | |
| `path` / `form` / `parent` | computed | Identity / graph | |
| `dataSource` | **`observableShallow`** | Live shallow array/bag | Options usually **replaced** as a whole. Nested option objects stay plain. |
| `data` | **`observable` (deep)** | Live deep bag | Arbitrary payload; treat like a mini values tree if nested. |
| `validator` | **`observableRef`** | Reactive on **replace** | Prefer `setValidator` / `setValidatorRule` / directives; don't rely on in-place mutate of the array without reassignment. |
| `validateFirst` | `observableRef` | Reactive | |
| `inputValue` | `observableRef` | Last raw input (model) | Rarely needed in UI. |
| `componentType` | `observableRef` | Host component type | Driven by `as` in React binding. |
| `componentProps` | **`observableShallow`** | UI passthrough bag | Filled by React from non-directive props (`placeholder`, `className`, `style`, …). Nested objects stay plain. |
| `component` | computed → `[type, props]` | Tuple view | Prefer reading type/props separately if needed. |

**Not a stored reactive field property:** `reactions` (see §4).

---

## 4. `x-reactions` / `v-reactions` — register once

| Fact | Behavior |
|---|---|
| When | Only in **Field constructor** (`#initialize`): each function is wrapped in `autorun` and pushed to `disposers`. |
| Re-sync | **No.** React `useSyncFieldModel` does **not** update reactions when the prop changes. |
| Same path remount | `createField` reuses the existing Field → **same** reactions as first create (not re-bound from new prop). |
| Tear-down | Disposed with field `destroy` (form unmount / graph destroy), not on plain `onUnmount`. |

Implications:

- Pass a **stable** reaction that closes over what it needs, or read `field` / `field.form` inside the `autorun` so it tracks live state.
- Changing `x-reactions={fn}` on every render **does nothing** after the field already exists.
- Prefer **form `effects`** / field events for cross-field logic that must be reconfigured, or destroy/recreate the field path if you truly need new reactions.

```tsx
// Bound once when the field model is first created for this path
<f.String
  name="country"
  as="select"
  x-reactions={(field) => {
    // runs as autorun: re-executes when observables it reads change
    if (field.value === 'CN') {
      field.form.setValuesIn('province', '')
    }
  }}
/>
```

---

## 5. Directive write path vs read path (short)

| Directive / API | Writes | Later prop change |
|---|---|---|
| `x-initialValue`, display/pattern flags, `dataSource`, `data`, `validator`, … | Model via create + `useSyncFieldModel` | **Re-synced** when React prop identity/value changes (see ref 02) |
| `x-reactions` | `autorun` at create only | **Not** re-synced |
| UI passthrough (`style`, `className`, …) | `componentProps` (shallow) | Replaced/merged when React binding detects change |
| `form.values` / field `value` | User input / `setValues*` | Deep tree; **read** `value` as snapshot |

---

## 6. Consumer checklist

1. Need UI to update when model changes → read inside **`observer`** (or use `f.*`, which already is).
2. Need a plain object (API body, freeze-friendly handoff) → **`toJS` / `getValuesIn`**, not live `form.values` mutation/export.
3. Controlled host `value` → **`field.value`** (already snapshot).
4. Options list on the model → **`dataSource`** (shallow); replace the list to notify.
5. Side effects on a field → **`x-reactions` is create-time only**; don't expect prop updates to rebind.

Related: ref **04** (observer / submit), ref **02** (directive matrix), ref **05** (`as` / `x-ref`).
