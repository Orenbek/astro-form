export type Subscriber = { type: string; cb: (...args: any[]) => any }
export type EventType = { type: string; payload: any }

export class Subscribable {
  private subscribers: Array<Subscriber> = []

  subscribe(sub: Subscriber) {
    this.subscribers.push(sub)
    const index = this.subscribers.length - 1
    const dispose = () => {
      this.subscribers.splice(index, 1)
    }
    return dispose
  }

  clearAll() {
    this.subscribers = []
  }

  emit(event: EventType) {
    this.subscribers.forEach((sub) => {
      if (sub.type === event.type) {
        sub.cb.call(null, event.payload)
      }
    })
  }
}
