import type { Meta, StoryObj } from '@storybook/react'
import { Wrapper } from './utils'
import { f, useForm } from '../src'
import { toJS } from 'mobx'

const MainImpl = () => {
  const form = useForm()
  console.log(toJS(form.values))
  return (
    <div>
      {!form.values?.check && <f.String name="input" as="input" />}
      <f.Boolean name="check" as="input" type="checkbox" />
    </div>
  )
}

const Main = Wrapper(MainImpl)

const meta = {
  title: 'React/Main',
  component: Main,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Main>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
