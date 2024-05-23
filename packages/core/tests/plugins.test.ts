import { createForm } from '../src/index'
import { KeepInSyncValue } from '../src/plugins/index'

import { attach } from './shared'

test('KeepInSyncValue', async () => {
  const form = attach(createForm({}))
  const aa = attach(
    form.createField({
      name: 'aa',
      initialValue: 'test',
      plugins: [KeepInSyncValue],
    })!
  )
  expect(form.values.aa).toEqual('test')
  form.setInitialValues({ aa: 'test2' })
  expect(form.values.aa).toEqual('test2')
  aa.value = 'test3'
  aa.initialValue = 'test4'
  expect(form.values.aa).toEqual('test3')
})
