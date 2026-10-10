import type { RelayCallback, RelayClient, RelayValue } from "./relay";

/** Private to a single server room. No network listener or externally usable address. */
export class MemoryRelay implements RelayClient {
  connected = false;
  private values = new Map<string, RelayValue>();
  private listeners = new Set<{ pattern: string; callback: RelayCallback }>();
  private connectedListeners: Array<() => void> = [];
  private matches(pattern: string, address: string) {
    const a = pattern.split("/");
    const b = address.split("/");
    return a.length === b.length && a.every((part, i) => part === "*" || part === b[i]);
  }
  async connect() {
    this.connected = true;
    for (const cb of this.connectedListeners) cb();
  }
  on(pattern: string, callback: RelayCallback) {
    const sub = { pattern, callback };
    this.listeners.add(sub);
    for (const [address, value] of this.values)
      if (this.matches(pattern, address)) callback(structuredClone(value), address);
    return () => {
      this.listeners.delete(sub);
    };
  }
  set(address: string, value: RelayValue) {
    if (value === null) this.values.delete(address);
    else this.values.set(address, structuredClone(value));
    this.emit(address, value);
  }
  emit(address: string, value: RelayValue = 1) {
    for (const sub of this.listeners)
      if (this.matches(sub.pattern, address)) sub.callback(structuredClone(value), address);
  }
  cached(address: string) {
    return structuredClone(this.values.get(address));
  }
  async get(address: string) {
    return this.cached(address) as RelayValue;
  }
  onConnect(cb: () => void) {
    this.connectedListeners.push(cb);
  }
  onDisconnect() {}
  onReconnect() {}
  onError() {}
  close() {
    this.connected = false;
    this.listeners.clear();
    this.values.clear();
    this.connectedListeners = [];
  }
}
