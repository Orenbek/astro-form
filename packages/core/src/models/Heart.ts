import { isStr, isArr } from '@astro-form/shared'

import { Subscribable } from '@/shared/subscribable'

import { LifeCycle } from './LifeCycle'

export interface IHeartProps<Context> {
  lifecycles?: LifeCycle[]
  context?: Context
}

export type HeartSubscriber = ({ type, payload }: { type: string; payload: any }) => void

export class Heart<Payload = any, Context = any> extends Subscribable {
  lifecycles: LifeCycle<Payload>[] = []

  outerLifecycles: Map<any, LifeCycle<Payload>[]> = new Map()

  context: Context

  constructor({ lifecycles, context }: IHeartProps<Context> = {}) {
    super()
    this.lifecycles = this.buildLifeCycles(lifecycles || [])
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this.context = context
  }

  buildLifeCycles(lifecycles: LifeCycle[]): LifeCycle[] {
    return lifecycles.reduce<LifeCycle[]>((buf, item) => {
      if (item instanceof LifeCycle) {
        return buf.concat(item)
      }
      if (isArr(item)) {
        return this.buildLifeCycles(item)
      }
      if (typeof item === 'object') {
        this.context = item
        return buf
      }
      return buf
    }, [])
  }

  addLifeCycles = (id: any, lifecycles: LifeCycle[] = []) => {
    const observers = this.buildLifeCycles(lifecycles)
    if (observers.length) {
      this.outerLifecycles.set(id, observers)
    }
  }

  hasLifeCycles = (id: any) => {
    return this.outerLifecycles.has(id)
  }

  removeLifeCycles = (id: any) => {
    this.outerLifecycles.delete(id)
  }

  setLifeCycles = (lifecycles: LifeCycle[] = []) => {
    this.lifecycles = this.buildLifeCycles(lifecycles)
  }

  publish = <P, C>(type: any, payload?: P, context?: C) => {
    if (isStr(type)) {
      this.lifecycles.forEach((lifecycle) => {
        lifecycle.notify(type, payload as Payload, context || this.context)
      })
      this.outerLifecycles.forEach((lifecycles) => {
        lifecycles.forEach((lifecycle) => {
          lifecycle.notify(type, payload as Payload, context || this.context)
        })
      })
      this.notify({
        type,
        payload,
      })
    }
  }

  clear = () => {
    this.lifecycles = []
    this.outerLifecycles.clear()
    this.unsubscribe()
  }
}
