import { INITIAL_STATE, reduce } from "./state-machine";
import type { RoomState } from "./types";

/** Narrow authority port: implemented by Doot RoomRuntime on the server and by
 * this local state machine offline. Game orchestration sits above the engine. */
export interface RoundAuthority {
  state(): RoomState;
  inputsFor(round: number): Map<string, unknown>;
  submit(round: number, participant: string, input: unknown): void;
  start(): void;
  open(): void;
  lock(): void;
  reveal(): void;
  next(): void;
  finish(results: unknown): Promise<void>;
  replay(): void;
  dispose(): void;
}
export class LocalRoundAuthority implements RoundAuthority {
  private current = structuredClone(INITIAL_STATE);
  private inputs = new Map<number, Map<string, unknown>>();
  constructor(private roundCount: number) {}
  state() {
    return structuredClone(this.current);
  }
  inputsFor(round: number) {
    return new Map(this.inputs.get(round));
  }
  submit(round: number, participant: string, input: unknown) {
    if (!this.inputs.has(round)) this.inputs.set(round, new Map());
    this.inputs.get(round)?.set(participant, structuredClone(input));
  }
  start() {
    this.current = reduce(this.current, { type: "start" });
  }
  open() {
    this.current = reduce(this.current, { type: "open", deadline: null });
  }
  lock() {
    this.current = reduce(this.current, { type: "lock" });
  }
  reveal() {
    this.current = reduce(this.current, { type: "reveal" });
  }
  next() {
    this.current = reduce(this.current, { type: "next", roundCount: this.roundCount });
  }
  async finish(_results: unknown) {
    this.current = reduce(this.current, { type: "finish" });
  }
  replay() {
    this.inputs.clear();
    this.current = structuredClone(INITIAL_STATE);
    this.start();
  }
  dispose() {
    this.inputs.clear();
  }
}
