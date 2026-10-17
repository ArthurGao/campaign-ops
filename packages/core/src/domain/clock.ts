/** Time source. Production uses the demo clock; tests use a fixed or manual clock. */
export interface Clock {
  now(): Date;
}

/** Deferred work (agent runs, mock factory). Tests replace it with a manual scheduler. */
export interface Scheduler {
  schedule(delayMs: number, task: () => void): void;
  /** Drop every pending task (used by demo reset). */
  cancelAll(): void;
}

export const CLOCK = Symbol('CLOCK');
export const SCHEDULER = Symbol('SCHEDULER');

/** The seed's reference instant: Thursday 15 Oct 2026, 10:00 Pacific/Auckland (NZDT, UTC+13). */
export const SEED_NOW = new Date('2026-10-14T21:00:00.000Z');

/**
 * Demo clock (docs/decisions.md D-10): seed time plus wall time elapsed since the last reset,
 * so relative dates in the seed look the same whenever the demo runs.
 */
export class DemoClock implements Clock {
  private resetAtWall = Date.now();

  reset(): void {
    this.resetAtWall = Date.now();
  }

  /** Wall-clock instant of the last reset; persisted so demo time continues across page reloads. */
  get resetAt(): number {
    return this.resetAtWall;
  }

  restore(resetAtWall: number): void {
    this.resetAtWall = resetAtWall;
  }

  now(): Date {
    return new Date(SEED_NOW.getTime() + (Date.now() - this.resetAtWall));
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date = SEED_NOW) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class TimerScheduler implements Scheduler {
  private handles = new Set<ReturnType<typeof setTimeout>>();

  schedule(delayMs: number, task: () => void): void {
    const handle = setTimeout(() => {
      this.handles.delete(handle);
      task();
    }, delayMs);
    this.handles.add(handle);
  }

  cancelAll(): void {
    this.handles.forEach((h) => clearTimeout(h));
    this.handles.clear();
  }
}

/** Test scheduler: nothing runs until `advance` is called. */
export class ManualScheduler implements Scheduler {
  private queue: { at: number; task: () => void }[] = [];
  private elapsed = 0;

  constructor(private readonly clock?: FixedClock) {}

  schedule(delayMs: number, task: () => void): void {
    this.queue.push({ at: this.elapsed + delayMs, task });
  }

  cancelAll(): void {
    this.queue = [];
  }

  /** Run every task due within `ms`, in time order, including tasks scheduled while running. */
  advance(ms: number): void {
    const target = this.elapsed + ms;
    for (;;) {
      this.queue.sort((a, b) => a.at - b.at);
      const next = this.queue[0];
      if (!next || next.at > target) break;
      this.queue.shift();
      this.clock?.advance(next.at - this.elapsed);
      this.elapsed = next.at;
      next.task();
    }
    this.clock?.advance(target - this.elapsed);
    this.elapsed = target;
  }

  get pending(): number {
    return this.queue.length;
  }
}
