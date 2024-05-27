import React from 'react'

export const useMount = (onMount: React.EffectCallback) => {
  const ref = React.useRef(false)
  React.useEffect(() => {
    if (ref.current) {
      return
    }
    const dispose = onMount()
    ref.current = true
    // eslint-disable-next-line consistent-return
    return () => {
      if (dispose) {
        dispose()
      }
    }
  }, [])
}
