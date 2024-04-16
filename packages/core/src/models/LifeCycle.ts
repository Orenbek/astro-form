/* eslint-disable no-plusplus */
import { isFn, isObj, isStr } from '@astro-form/shared'

export type LifeCycleHandler<T> = (payload: T, context: any) => void
export type LifeCyclePayload<T> = (
  params: {
    type: string
    payload: T
  },
  context: any
) => void

type LifeCycleParams<Payload> = Array<string | LifeCycleHandler<Payload> | { [key: string]: LifeCycleHandler<Payload> }>
export class LifeCycle<Payload = any> {
  private listener: LifeCyclePayload<Payload>

  constructor(...params: LifeCycleParams<Payload>) {
    this.listener = this.buildListener(params)
  }

  buildListener(params: LifeCycleParams<Payload>) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this
    return function (payload: { type: string; payload: Payload }, ctx: any) {
      for (let index = 0; index < params.length; index++) {
        const item = params[index]
        const handlerFn = params[index + 1]
        if (isFn(item)) {
          item.call(that, payload.payload, ctx)
        } else if (isStr(item) && isFn(handlerFn)) {
          if (item === payload.type) {
            handlerFn.call(that, payload.payload, ctx)
          }
          index++
        } else if (isObj(item)) {
          Object.entries(item).forEach(([type, handler]) => {
            if (type === payload.type) {
              handler.call(that, payload.payload, ctx)
            }
          })
        }
      }
    }
  }

  notify(type: any, payload?: Payload, ctx?: any) {
    if (isStr(type)) {
      this.listener.call(ctx, { type, payload: payload as Payload }, ctx)
    }
  }
}
