import { Subscribable, Subscriber, EventType } from './Subscribable'

export class LifeCycle {
  private subscriber = new Subscribable()

  /** 缓存 effect 下注册的所有 eventListener 的 dispose 函数 */
  private effects: Map<string, Array<() => void>> = new Map()

  private eventDisposer: Array<() => void> = []

  addEffects(id: string, effects: () => void) {
    if (this.effects.has(id)) {
      // 如果有注册 则删除重新添加
      this.removeEffects(id)
    }
    try {
      effects()
    } finally {
      this.effects.set(id, this.eventDisposer)
      this.eventDisposer = []
    }
  }

  removeEffects(id: string) {
    const disposers = this.effects.get(id)
    if (!disposers) return
    disposers.forEach((dispose) => dispose())
    this.effects.delete(id)
  }

  /** 注册生命周期监听函数 */
  registerLifeCycleSubscriber(sub: Subscriber) {
    const dispose = this.subscriber.subscribe(sub)
    this.eventDisposer.push(dispose)
  }

  clearAll() {
    this.effects.clear()
    this.subscriber.clearAll()
  }

  emit(event: EventType) {
    this.subscriber.emit(event)
  }
}
