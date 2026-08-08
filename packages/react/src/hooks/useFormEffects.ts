import { useEffect, useId } from 'react'
import type { Form } from '@astro-form/core'
import { useForm } from '../FormContext'

export function useFormEffects(effects: (f: Form) => void) {
  const form = useForm()
  const id = useId()
  // effects 建议用 useCallback 或模块级函数，避免无 id 反复替换
  useEffect(() => {
    form.addEffects(id, effects)
    return () => form.removeEffects(id)
  }, [form, id, effects])
}
