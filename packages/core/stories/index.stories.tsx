/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { Path as FormPath } from '@formily/path'
import { autorun, toJS } from 'mobx'

import { LifeCycles, createForm, isArrayField, isField, isObjectField } from '../src'
import { Field } from '../src/models/Field'

import { attach } from './shared'

const Component: React.FC<any> = ({ backgroundColor, color }) => (
  <button type="button" style={{ backgroundColor, color }} onClick={async () => {}}>
    this is a Story Component
  </button>
)

export default {
  title: 'Example/Component',
  component: Component,
  argTypes: {
    backgroundColor: { control: 'color' },
    çolor: { control: 'color' },
  },
}

export const Primary = {
  args: {
    backgroundColor: '#1ea7fd',
    color: 'white',
  },
}

export const Secondary = {
  args: {
    backgroundColor: 'transparent',
    color: '#333',
  },
}
