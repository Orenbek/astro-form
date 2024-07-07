import React from 'react'
import { observable } from 'mobx'
import type { Field } from '@astro-form/core'

export function useRef<T = Field>() {
  const ref = React.useRef(observable.box<T | null>(null, { deep: false }))
  return ref.current
}
