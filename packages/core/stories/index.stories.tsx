/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'

const Component: React.FC<any> = ({ backgroundColor, color }) => (
  <button type="button" style={{ backgroundColor, color }}>
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
