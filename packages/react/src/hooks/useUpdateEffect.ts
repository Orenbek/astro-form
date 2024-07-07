import { useEffect, useRef } from 'react'

export function useUpdateEffect(effect: () => void, deps: any[]) {
  const isMounted = useRef(false)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return undefined
    }
    return effect()
  }, deps)
}
