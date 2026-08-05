import React from 'react'
import type { IObservableValue } from 'mobx'

/** Props shape used by compiler slot / multi-ref merge (React 19: element.props is unknown). */
type PassRefProps = {
  $$ref?: IObservableValue<any> | Array<IObservableValue<any>>
}

/**
 * Merge a Field-ref box onto slot children (`.aform` composition helper).
 *
 * ## Why this exists (historical / compiler contract)
 * In `.aform`, a wrapper component can host fields via `<slot>`, and **both** sides may need
 * the same core `Field` instance:
 *
 * ```aform
 * // page
 * <Item>
 *   <f.string name="test" x:ref={pageRef} />
 * </Item>
 *
 * // Item.aform — wrapper also wants the field for UI chrome / effects
 * <div>
 *   <slot x:ref={itemRef} />
 * </div>
 * ```
 *
 * Compiler turns `<slot x:ref={itemRef} />` into roughly:
 *   `{$$passRefToChild($$props.children, itemRef)}`
 *
 * Without merging, the wrapper's ref would overwrite the page's `x:ref` (or never reach the
 * nested `f.*`). After merge, BaseField receives `$$ref` as a single box **or an array of
 * boxes**, and writes the created Field into every box (see Field.tsx mount effect).
 *
 * ## Notes
 * - `$$ref` is **not** a DOM/React ref; it is a MobX `observable.box` (see `useRef` in this package).
 * - Only the first child is cloned when `node` is an array (slot content is typically one root).
 * - Pure hand-written React rarely needs this; prefer `form.query(path).take()` unless replaying
 *   the slot-wrapper pattern.
 *
 * @see packages/compiler/src/printer/print-slot.ts
 */
export function passRefToChild(node: React.ReactNode | undefined, ref: IObservableValue<any>) {
  if (Array.isArray(node)) {
    let newNode: React.ReactNode | undefined
    if (React.isValidElement(node[0])) {
      const el = node[0] as React.ReactElement<PassRefProps>
      newNode = React.cloneElement(el, { ...el.props, $$ref: getRef(el, ref) })
    }
    return node.map((it, index) => (index === 0 ? newNode || it : it))
  }
  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<PassRefProps>
    return React.cloneElement(el, { ...el.props, $$ref: getRef(el, ref) })
  }
  return node
}

/** Append `ref` to existing `$$ref` (scalar or array) so multiple consumers share one Field. */
function getRef(node: React.ReactElement<PassRefProps>, ref: IObservableValue<any>) {
  const existing = node.props.$$ref
  if (!existing) {
    return ref
  }
  if (Array.isArray(existing)) {
    return [...existing, ref]
  }
  return [existing, ref]
}
