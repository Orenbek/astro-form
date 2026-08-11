import type { FormPathPattern, GeneralField } from '@astro-form/core'
import { FormPath } from '@astro-form/core'

import { useForm } from '../FormContext'
import { useBasePath } from '../FieldContext'

/**
 * Read a registered Field model (does not create). Path joins like child `name`:
 * `FormPath.parse(basePath).concat(path)`. No path → field at current `basePath`
 * (root → `undefined`). Readers need `observer`.
 */
export function useField(): GeneralField | undefined
export function useField(path: FormPathPattern): GeneralField | undefined
export function useField(path?: FormPathPattern): GeneralField | undefined {
  const form = useForm()
  const basePath = useBasePath()

  if (path === undefined) {
    if (basePath === undefined || basePath === '') {
      return undefined
    }
    return form.query(basePath).take()
  }

  const fullPath = FormPath.parse(basePath ?? '')
    .concat(path)
    .toString()
  return form.query(fullPath).take()
}
