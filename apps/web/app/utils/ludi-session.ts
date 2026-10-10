import type { LudiAction, LudiSession, LudiView } from "@doot-games/sdk/ludi";

export interface ConnectionState {
  state: "connected" | "reconnecting" | "ended";
  message: string;
}
export class RoomSession implements LudiSession {
  private view: LudiView;
  private listeners = new Set<(view: LudiView) => void>();
  private events?: EventSource;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private attempt = 0;
  private closed = false;
  constructor(
    initial: LudiView,
    private onConnection: (status: ConnectionState) => void,
  ) {
    this.view = initial;
    this.connectEvents();
  }
  private connectEvents() {
    if (this.closed) return;
    const events = new EventSource(`/api/ludi/rooms/${this.view.code}/events`);
    this.events = events;
    events.addEventListener("snapshot", (event) => {
      if (this.closed || this.events !== events) return;
      try {
        this.accept(JSON.parse((event as MessageEvent).data));
      } catch {
        void this.refresh().catch(() => {});
        return;
      }
      this.onConnection({ state: "connected", message: "" });
    });
    events.addEventListener("expired", () => this.expired());
    events.onopen = () => {
      this.attempt = 0;
      this.onConnection({ state: "connected", message: "" });
    };
    events.onerror = () => {
      if (this.closed || this.events !== events) return;
      this.onConnection({
        state: "reconnecting",
        message: "A restabelecer a ligação. A tua resposta confirmada continua guardada.",
      });
      void this.refresh()
        .catch(() => {})
        .finally(() => {
          // CONNECTING retries are owned by EventSource. CLOSED needs a new instance.
          if (this.closed || events.readyState !== 2 || this.retryTimer) return;
          const delay = Math.min(1000 * 2 ** this.attempt++, 30_000);
          this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined;
            events.close();
            this.connectEvents();
          }, delay);
        });
    };
  }
  private accept(view: LudiView) {
    // SSE can overtake HTTP; ignore old/duplicate snapshots from either path.
    if (this.closed || view.revision <= this.view.revision) return;
    this.view = view;
    for (const listener of this.listeners) listener(structuredClone(view));
  }
  private expired() {
    this.disconnect();
    this.onConnection({
      state: "ended",
      message: "A sala terminou ou o servidor foi reiniciado. Cria uma nova sala.",
    });
  }
  private async refresh() {
    const response = await fetch(`/api/ludi/rooms/${this.view.code}`, { cache: "no-store" });
    if (response.status === 410) {
      this.expired();
      return;
    }
    if (response.status === 401 || response.status === 403) {
      this.disconnect();
      this.onConnection({
        state: "ended",
        message:
          "Não foi possível recuperar a tua identidade. Usa o browser original ou cria uma nova sala.",
      });
      return;
    }
    if (response.ok) this.accept(await response.json());
  }
  observe(listener: (view: LudiView) => void) {
    this.listeners.add(listener);
    listener(structuredClone(this.view));
    return () => {
      this.listeners.delete(listener);
    };
  }
  availableActions() {
    return this.closed ? [] : this.view.actions;
  }
  async send(action: LudiAction) {
    if (this.closed) throw new Error("Esta ligação terminou. Cria uma nova sala.");
    const request = () =>
      fetch(`/api/ludi/rooms/${this.view.code}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
    // Lost response after commit: retry with the SAME idempotency key.
    const response = await request().catch(() => request());
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 410) this.expired();
      else await this.refresh().catch(() => {});
      throw new Error(result.message ?? "Não foi possível enviar a ação.");
    }
    if (typeof result.revision !== "number") {
      await this.refresh().catch(() => {});
      throw new Error("Não foi possível confirmar a ação. Verifica a ligação.");
    }
    this.accept(result);
  }
  disconnect() {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.events?.close();
    this.listeners.clear();
  }
}
export function ludiActionId() {
  // crypto.randomUUID is unavailable on a phone using an HTTP LAN address.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
