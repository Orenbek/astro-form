import React from 'react'

export const useForceUpdate = () => {
  const [, setState] = React.useState({})
  return React.useCallback(() => setState({}), [])
}
