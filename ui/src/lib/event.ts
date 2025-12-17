export interface Event {
  name: string;
}

export class EventEmitter<E extends Event = Event> {
  private events: Record<E["name"], ((event: E) => void)[]>;

  constructor() {
    this.events = {} as Record<E["name"], ((event: E) => void)[]>;
  }

  on(event: E["name"], callback: (event: E) => void) {
    if (this.events[event] === undefined) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: E) {
    const callbacks = this.events[event.name as E["name"]] ?? [];
    callbacks.forEach((callback) => callback(event));
  }
}
