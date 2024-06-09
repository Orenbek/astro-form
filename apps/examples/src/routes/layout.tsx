import React from 'react'
import { Outlet } from '@modern-js/runtime/router'
import { createForm } from '@astro-form/core'
import { FormProvider } from '@astro-form/react'

import Test from './test.aform'

export default function Layout() {
  const form = React.useMemo(() => createForm(), [])
  console.log(form)
  return (
    <div>
      <FormProvider form={form}>
        <Test />
      </FormProvider>
      <Outlet />
    </div>
  )
}
