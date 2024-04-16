/* eslint-disable no-plusplus */
import { isFn } from '@astro-form/shared'

export type Subscriber<S> = (payload: S) => void

export interface Subscription<S> {
  notify?: (payload: S) => void | boolean
  filter?: (payload: S) => any
}

export class Subscribable<Payload = any> {
  subscribers: {
    index: number
    [key: number]: Subscriber<Payload>
  } = {
    index: 0,
  }

  subscription!: Subscription<Payload>

  subscribe(callback?: Subscriber<Payload>): number {
    if (isFn(callback)) {
      const index: number = this.subscribers.index + 1
      this.subscribers[index] = callback
      this.subscribers.index++
      return index
    }
    return -1
  }

  unsubscribe = (index?: number) => {
    if (index !== undefined && this.subscribers[index]) {
      delete this.subscribers[index]
    } else if (!index) {
      this.subscribers = {
        index: 0,
      }
    }
  }

  notify(payload?: Payload, silent?: boolean) {
    if (this.subscription && isFn(this.subscription.notify)) {
      if (this.subscription.notify.call(this, payload as Payload) === false) {
        return
      }
    }
    if (silent) return
    const filter = (p: Payload) => {
      if (this.subscription && isFn(this.subscription.filter)) {
        return this.subscription.filter.call(this, p)
      }
      return p
    }
    Object.values(this.subscribers).forEach((callback) => {
      if (isFn(callback)) {
        callback(filter(payload as Payload))
      }
    })
  }
}
