import React from 'react'
import { createForm } from '@astro-form/core'
import { observer } from 'mobx-react-lite'

import { FormProvider } from '../src/index'

export function Wrapper(Component: React.FC) {
  const ChildComponent = observer(Component)
  return function Test() {
    const form = React.useMemo(() => createForm(), [])
    return (
      <FormProvider form={form}>
        <ChildComponent />
      </FormProvider>
    )
  }
}
